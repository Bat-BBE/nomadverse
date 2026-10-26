'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, world } from '@/game/store';
import { cam, cameraPose, START } from './Player';
import { heightAt } from '@/game/terrain';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Opening shot: descend from the heights toward the ger, then hold with a slow
// drift. On "Enter" blend into the gameplay follow camera.
const PATH = [
  new THREE.Vector3(-170, 85, 150),
  new THREE.Vector3(-95, 38, 72),
  new THREE.Vector3(-38, 11, 25),
  new THREE.Vector3(-17, 4.2, 11),
];
const LOOK = [new THREE.Vector3(60, 25, -80), new THREE.Vector3(15, 6, -15), new THREE.Vector3(3, 2.2, -3), new THREE.Vector3(9, 2.8, -7)];
const DURATION = 16;

export function Director() {
  const phase = useGame((s) => s.phase);
  const scene = useGame((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(PATH), []);
  const lookCurve = useMemo(() => new THREE.CatmullRomCurve3(LOOK), []);
  const t0 = useRef<number | null>(null);
  const blend = useRef<{ start: number; from: THREE.Vector3; fromLook: THREE.Vector3 } | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const end = useMemo(() => new THREE.Vector3(), []);

  // returning outside: put the player at the door, camera in front of it
  useEffect(() => {
    if (scene !== 'outside' || phase !== 'play') return;
    const p = world.player;
    if (!useGame.getState().mounted) {
      p.x = 0.4;
      p.z = 6.2;
      p.heading = 0.2;
    }
    cam.yaw = 0.5;
    cam.pitch = 0.28;
    cam.dist = cam.targetDist;
    cameraPose(camera.position, cam.yaw, cam.pitch, cam.dist, p.x, heightAt(p.x, p.z) + 1.55, p.z);
    camera.lookAt(p.x, heightAt(p.x, p.z) + 1.55, p.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame(({ clock }) => {
    if (phase === 'play') return;
    const now = clock.elapsedTime;
    if (t0.current === null) t0.current = now;

    if (phase === 'title') {
      const u = Math.min(1, (now - t0.current) / DURATION);
      const e = ease(u);
      curve.getPoint(e, pos);
      lookCurve.getPoint(e, look);
      // gentle hand-held drift once the shot settles
      const drift = now * 0.05;
      pos.x += Math.sin(drift) * 1.5 * u;
      pos.y += Math.sin(drift * 1.7) * 0.3 * u;
      pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + 2);
      camera.position.copy(pos);
      camera.lookAt(look);
      blend.current = null;
      return;
    }

    // entering: blend from wherever the intro is to the gameplay camera
    if (!blend.current) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      blend.current = { start: now, from: camera.position.clone(), fromLook: camera.position.clone().add(dir.multiplyScalar(20)) };
    }
    const b = blend.current;
    const u = Math.min(1, (now - b.start) / 2.4);
    const e = ease(u);
    const ty = heightAt(START.x, START.z) + 1.55;
    cameraPose(end, cam.yaw, cam.pitch, cam.dist, START.x, ty, START.z);
    camera.position.lerpVectors(b.from, end, e);
    look.lerpVectors(b.fromLook, new THREE.Vector3(START.x, ty, START.z), e);
    camera.lookAt(look);
    if (u >= 1) {
      useGame.getState().setPhase('play');
      useGame.getState().toast('Өглөөний хөндий', 'Өнөөдрийн аяллаа эхлүүл.');
    }
  });

  return null;
}
