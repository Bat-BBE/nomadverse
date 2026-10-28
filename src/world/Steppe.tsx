'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt } from '@/game/terrain';
import { useGame } from '@/game/store';
import { sculpt } from '@/game/geo';

// Аргал on the pasture: dried cow dung patties, the steppe's firewood. Each
// patch can be gathered once a day (E); the next morning the cattle have left
// new ones. The fire under the tea, tarag and aaruul pots burns them.

export const ARGAL_SPOTS: { x: number; z: number }[] = [
  { x: -22, z: 4 },
  { x: -26, z: -18 },
  { x: -8, z: -22 },
  { x: 6, z: -28 },
  { x: 20, z: -20 },
  { x: 24, z: 10 },
  { x: -30, z: 14 },
  { x: -12, z: 20 },
  { x: 10, z: 22 },
  { x: -40, z: -4 },
];
const PER = 3; // patties in each patch

export function ArgalPatches() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const taken = useGame((s) => s.argalTaken);
  const geo = useMemo(() => {
    // a flattened, cracked, lumpy disc
    return sculpt(0.5, 18, 10, (d) => {
      const k = 1 + Math.sin(d.x * 9 + d.z * 7) * 0.08 + Math.sin(d.x * 23) * Math.sin(d.z * 19) * 0.04;
      return d.set(d.x * 0.5 * k, Math.max(-0.05, d.y) * 0.16 * k, d.z * 0.5 * k);
    });
  }, []);
  const layout = useMemo(
    () =>
      ARGAL_SPOTS.flatMap((p, i) =>
        Array.from({ length: PER }, (_, k) => {
          const a = i * 2.4 + k * 2.1;
          const r = k === 0 ? 0 : 0.42 + k * 0.1;
          const x = p.x + Math.cos(a) * r;
          const z = p.z + Math.sin(a) * r;
          return { i, x, z, s: 0.42 - k * 0.06, rot: a * 1.7 };
        })
      ),
    []
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    layout.forEach((l, n) => {
      const gone = taken.includes(l.i);
      q.setFromEuler(new THREE.Euler(0, l.rot, 0));
      m.compose(v.set(l.x, heightAt(l.x, l.z) + 0.03, l.z), q, gone ? sc.set(0, 0, 0) : sc.set(l.s, l.s, l.s));
      mesh.current?.setMatrixAt(n, m);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [layout, taken]);
  // a faint shimmer marks gatherable patches when the day's chore is open
  const ring = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const s = useGame.getState();
    const want = s.chores.some((c) => c.id === 'argal' && !c.done) || s.request?.id === 'tsetseg_fire';
    if (!ring.current) return;
    ring.current.visible = want;
    if (!want) return;
    const m = new THREE.Matrix4();
    const k = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
    ARGAL_SPOTS.forEach((p, i) => {
      const gone = s.argalTaken.includes(i);
      m.makeScale(gone ? 0 : k, 1, gone ? 0 : k);
      m.setPosition(p.x, heightAt(p.x, p.z) + 0.06, p.z);
      ring.current!.setMatrixAt(i, m);
    });
    ring.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={mesh} args={[geo, undefined, layout.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial color="#6e5236" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={ring} args={[undefined, undefined, ARGAL_SPOTS.length]} frustumCulled={false}>
        <ringGeometry args={[0.9, 1.05, 32]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
}
