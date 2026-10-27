'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, world } from '@/game/store';
import { cam, cameraPose } from './Player';
import { heightAt } from '@/game/terrain';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Opening shot: descend from the heights toward the ger, then hold with a slow
// drift. On "Enter" blend into the gameplay follow camera.
const PATH = [
  new THREE.Vector3(-170, 56, 150), // below the cloud layer
  new THREE.Vector3(-95, 38, 72),
  new THREE.Vector3(-38, 11, 25),
  new THREE.Vector3(-17, 4.2, 11),
];
// the final frame keeps the ger right of centre, leaving the left third for the title
const LOOK = [new THREE.Vector3(60, 25, -80), new THREE.Vector3(15, 6, -15), new THREE.Vector3(3, 2.2, -3), new THREE.Vector3(-4.5, 3.2, -7)];
// portrait phones: the title sits low, so frame the ger in the upper half
const LOOK_PORTRAIT = [LOOK[0], LOOK[1], new THREE.Vector3(1, 1.2, -1), new THREE.Vector3(0.5, -0.9, 0)];
const DURATION = 16;

export function Director() {
  const phase = useGame((s) => s.phase);
  const scene = useGame((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(PATH), []);
  const lookCurve = useMemo(() => new THREE.CatmullRomCurve3(LOOK), []);
  const lookPortrait = useMemo(() => new THREE.CatmullRomCurve3(LOOK_PORTRAIT), []);
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
      p.x = 0;
      p.z = 3.9;
      p.heading = 0;
      world.cutscene = { type: 'exit', t: 0 };
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

    if (phase === 'title' || phase === 'create') {
      const u = Math.min(1, (now - t0.current) / DURATION);
      const e = ease(u);
      curve.getPoint(e, pos);
      ((camera as THREE.PerspectiveCamera).aspect < 1 ? lookPortrait : lookCurve).getPoint(e, look);
      // once the shot settles: a slow circling sway around the ger and a breath of height
      const after = Math.max(0, now - t0.current - DURATION);
      const k = Math.min(1, after / 6);
      const phi = Math.sin(after * 0.045) * 0.42 * k;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const px = pos.x;
      const pz = pos.z;
      pos.x = px * c - pz * sn;
      pos.z = px * sn + pz * c;
      const lx = look.x;
      const lz = look.z;
      look.x = lx * c - lz * sn;
      look.z = lx * sn + lz * c;
      pos.y += Math.sin(now * 0.085) * 0.35 * u;
      pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + 2);
      camera.position.copy(pos);
      camera.lookAt(look);
      blend.current = null;
      return;
    }

    // entering: blend from wherever the intro is to the gameplay camera
    if (!blend.current) {
      cam.yaw = world.player.heading + Math.PI + 0.35;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      blend.current = { start: now, from: camera.position.clone(), fromLook: camera.position.clone().add(dir.multiplyScalar(20)) };
    }
    const b = blend.current;
    const u = Math.min(1, (now - b.start) / 2.4);
    const e = ease(u);
    // land behind the player (a new journey starts at the camp; Continue at the saved spot)
    const P = world.player;
    const ty = heightAt(P.x, P.z) + 1.55;
    cameraPose(end, cam.yaw, cam.pitch, cam.dist, P.x, ty, P.z);
    camera.position.lerpVectors(b.from, end, e);
    look.lerpVectors(b.fromLook, new THREE.Vector3(P.x, ty, P.z), e);
    camera.lookAt(look);
    if (u >= 1) {
      const g = useGame.getState();
      g.setPhase('play');
      if (world.intro) {
        // the guide welcomes you and points you to your chosen activity
        world.intro = false;
        setTimeout(() => useGame.getState().setModal({ type: 'npc', id: 'tsetseg' }), 600);
      } else {
        g.toast(`Тавтай морил, ${g.profile.name}`, 'Аялал чинь үргэлжилж байна');
      }
    }
  });

  return null;
}
