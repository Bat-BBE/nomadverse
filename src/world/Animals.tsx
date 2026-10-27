'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loft, sculpt } from '@/game/geo';
import { heightAt, LOC, slopePitch } from '@/game/terrain';
import { world } from '@/game/store';
import { addStatic, bodyCircles, setMover } from '@/game/colliders';

// ---------------------------------------------------------------- Horse
// The horse model lives in ./Horse; re-exported here for existing imports.
import { HorseModel, type HorseHandle } from './Horse';
export { HorseModel };
export type { HorseHandle, HorseAnim } from './Horse';

// ---------------------------------------------------------------- Pasture herd

const COATS: [string, string][] = [
  ['#8a5a34', '#2b1d14'], // chestnut-bay
  ['#d9d2c3', '#bdb4a3'], // grey/white
  ['#3a2c24', '#1a1410'], // black
  ['#b08850', '#6a4a2a'], // dun
  ['#6e4a33', '#20160f'],
];

function WanderingHorse({ index, coat }: { index: number; coat: [string, string] }) {
  const h = useRef<HorseHandle>(null);
  const st = useRef({
    x: LOC.pasture.x + Math.cos(index * 2.1) * 6,
    z: LOC.pasture.z + Math.sin(index * 2.1) * 6,
    heading: index,
    tx: 0,
    tz: 0,
    timer: 2 + index * 1.7,
    walking: false,
  });

  useFrame((_, dt) => {
    const hh = h.current;
    const g = hh?.group;
    if (!hh || !g) return;
    const s = st.current;
    s.timer -= dt;
    if (s.timer <= 0) {
      s.walking = !s.walking;
      s.timer = s.walking ? 3 + Math.random() * 3 : 5 + Math.random() * 8;
      if (s.walking) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 11;
        s.tx = LOC.pasture.x + Math.cos(a) * r;
        s.tz = LOC.pasture.z + Math.sin(a) * r;
      }
    }
    const dpx = world.player.x - s.x;
    const dpz = world.player.z - s.z;
    const pd = Math.hypot(dpx, dpz);
    let speed = 0;
    if (s.walking) {
      const dx = s.tx - s.x;
      const dz = s.tz - s.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) s.walking = false;
      else {
        const want = Math.atan2(dx, dz);
        let diff = want - s.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        s.heading += diff * Math.min(1, dt * 2);
        // don't walk into the player standing in front
        const ahead = Math.hypot(s.x + Math.sin(s.heading) * 1.2 - world.player.x, s.z + Math.cos(s.heading) * 1.2 - world.player.z);
        speed = ahead < 1.3 ? 0 : 1.2;
        s.x += Math.sin(s.heading) * speed * dt;
        s.z += Math.cos(s.heading) * speed * dt;
      }
    }
    hh.anim.speed = speed;
    // curious: lift the head and look at a nearby player
    const near = pd < 5;
    hh.anim.graze = s.walking || near ? 0 : 1;
    if (near) {
      let rel = Math.atan2(dpx, dpz) - s.heading;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      hh.anim.look = THREE.MathUtils.clamp(rel, -0.7, 0.7);
    } else hh.anim.look = 0;
    bodyCircles(s.x, s.z, s.heading, 0.5, 0.42, 2).forEach((c, k) => setMover(`horse.p${index}.${k}`, c.x, c.z, c.r));
    g.position.set(s.x, heightAt(s.x, s.z), s.z);
    g.rotation.y = s.heading;
    g.rotation.x += (-slopePitch(s.x, s.z, s.heading) - g.rotation.x) * 0.1;
  });

  return <HorseModel ref={h} coat={coat[0]} mane={coat[1]} seed={index} />;
}

export function PastureHorses() {
  return (
    <>
      {COATS.map((c, i) => (
        <WanderingHorse key={i} index={i} coat={c} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Sheep & goats

interface Member {
  ox: number;
  oz: number;
  x: number;
  z: number;
  heading: number;
  phase: number;
  goat: boolean;
  scale: number;
  stride: number;
  grazeT: number;
}

// Mongolian fat-tailed sheep: lumpy fleece, broad fat tail, long drooping-eared
// head on a separate pivot (grazing), and four legs that step while walking.
let sheepGeo: { body: THREE.BufferGeometry; goatBody: THREE.BufferGeometry; head: THREE.BufferGeometry; leg: THREE.BufferGeometry } | null = null;
export function sheepGeometry() {
  if (sheepGeo) return sheepGeo;
  const fleece = sculpt(1, 28, 20, (d) => {
    // fleece clumps
    const n = Math.sin(d.x * 17 + d.y * 5) * Math.sin(d.z * 13 - d.y * 7) * 0.5 + Math.sin(d.x * 31 + d.z * 23) * 0.25;
    const r = 1 + n * 0.06;
    return new THREE.Vector3(d.x * 0.25 * r, d.y * 0.25 * r, d.z * 0.44 * r);
  });
  const tail = new THREE.SphereGeometry(1, 14, 10);
  tail.scale(0.2, 0.15, 0.12);
  tail.translate(0, -0.08, -0.42);
  const body = mergeGeometries([fleece, tail])!;
  const goat = sculpt(1, 22, 16, (d) => new THREE.Vector3(d.x * 0.2, d.y * 0.22, d.z * 0.4));
  // head: muzzle forward (+z), pivot at the back of the skull
  const skull = sculpt(1, 18, 12, (d) => {
    const taper = 1 - Math.max(0, d.z) * 0.35;
    return new THREE.Vector3(d.x * 0.075 * taper, d.y * 0.085 * taper, d.z * 0.13 + 0.09);
  });
  const ears = [1, -1].map((s) => {
    const e = new THREE.SphereGeometry(1, 8, 6);
    e.scale(0.07, 0.022, 0.035);
    e.rotateZ(s * 0.5);
    e.translate(s * 0.09, 0.02, 0.03);
    return e;
  });
  const head = mergeGeometries([skull, ...ears])!;
  const leg = new THREE.CylinderGeometry(0.032, 0.024, 0.32, 6);
  leg.translate(0, -0.16, 0); // pivot at the hip
  sheepGeo = { body, goatBody: goat, head, leg };
  return sheepGeo;
}

export const LEG_OFFSETS: [number, number, number][] = [
  [0.12, 0.32, 0.26],
  [-0.12, 0.32, 0.26],
  [0.12, 0.32, -0.26],
  [-0.12, 0.32, -0.26],
];

export function Flock({ count = 46 }: { count?: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const goats = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const center = useRef({ x: LOC.farPasture.x, z: LOC.farPasture.z, t: 0 });
  const geo = useMemo(sheepGeometry, []);

  const members = useMemo<Member[]>(() => {
    const out: Member[] = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 9;
      out.push({
        ox: Math.cos(a) * r,
        oz: Math.sin(a) * r,
        x: LOC.farPasture.x + Math.cos(a) * r,
        z: LOC.farPasture.z + Math.sin(a) * r,
        heading: Math.random() * 6,
        phase: Math.random() * 10,
        goat: i % 4 === 0,
        scale: 0.85 + Math.random() * 0.3,
        stride: 0,
        grazeT: Math.random() * 10,
      });
    }
    return out;
  }, [count]);
  const sheepIdx = useMemo(() => members.map((m, i) => (m.goat ? -1 : i)).filter((i) => i >= 0), [members]);
  const goatIdx = useMemo(() => members.map((m, i) => (m.goat ? i : -1)).filter((i) => i >= 0), [members]);

  useLayoutEffect(() => {
    const c = new THREE.Color();
    sheepIdx.forEach((mi, k) => bodies.current?.setColorAt(k, c.set('#e9e1cc').multiplyScalar(0.9 + Math.random() * 0.1)));
    goatIdx.forEach((mi, k) => goats.current?.setColorAt(k, c.set(['#4a3a2e', '#e8e2d6', '#7a5638'][k % 3])));
    members.forEach((m, i) => {
      // Mongolian sheep often have dark or brown heads
      heads.current?.setColorAt(i, m.goat ? c.set(['#4a3a2e', '#e8e2d6', '#7a5638'][goatIdx.indexOf(i) % 3]) : c.set(i % 3 ? '#2e241e' : '#7a5a3e'));
      for (let l = 0; l < 4; l++) legs.current?.setColorAt(i * 4 + l, c.set(m.goat ? '#3a2c22' : '#3f342a'));
    });
    for (const r of [bodies, goats, heads, legs]) if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
  }, [members, sheepIdx, goatIdx]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const q2 = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const o = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const b = bodies.current;
    const gm = goats.current;
    const h = heads.current;
    const lg = legs.current;
    if (!b || !gm || !h || !lg) return;
    const t = clock.elapsedTime;
    // the whole flock drifts slowly in a loop around the far pasture
    const c = center.current;
    c.t += dt * 0.01;
    c.x = LOC.farPasture.x + Math.cos(c.t) * 10;
    c.z = LOC.farPasture.z + Math.sin(c.t * 1.3) * 7;
    let si = 0;
    let gi = 0;

    members.forEach((m, i) => {
      const tx = c.x + m.ox;
      const tz = c.z + m.oz;
      let dx = tx - m.x;
      let dz = tz - m.z;
      // shy away from the player
      const px = m.x - world.player.x;
      const pz = m.z - world.player.z;
      const pd = Math.hypot(px, pz);
      if (pd < 5) {
        dx += (px / pd) * (5 - pd) * 3;
        dz += (pz / pd) * (5 - pd) * 3;
      }
      const d = Math.hypot(dx, dz);
      const moving = d > 0.5;
      let speed = 0;
      if (moving) {
        speed = Math.min(d * 0.6, pd < 5 ? 3 : 0.8);
        m.x += (dx / d) * speed * dt;
        m.z += (dz / d) * speed * dt;
        let diff = Math.atan2(dx, dz) - m.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        m.heading += diff * Math.min(1, dt * 3);
      }
      setMover(`flock.${i}`, m.x, m.z, 0.36);
      m.stride += (speed > 0.1 ? 1 : -1) * dt * 4;
      m.stride = Math.min(1, Math.max(0, m.stride));
      m.phase += dt * (2 + speed * 3.5) * m.stride;
      const y = heightAt(m.x, m.z);
      const s = m.scale * (m.goat ? 0.88 : 1);
      const bob = Math.abs(Math.sin(m.phase)) * 0.025 * m.stride;
      q.setFromAxisAngle(up, m.heading);

      // body
      v.set(m.x, y + 0.53 * s + bob, m.z);
      m4.compose(v, q, sc.set(s, s, s));
      if (m.goat) gm.setMatrixAt(gi++, m4);
      else b.setMatrixAt(si++, m4);

      // head: grazes in bouts, lifts to look around, stays up while walking
      m.grazeT += dt;
      const graze = moving ? 0 : 0.5 + 0.5 * Math.sin(m.grazeT * 0.35 + m.phase * 0.1);
      o.set(0, 0.62 - graze * 0.3, 0.4).multiplyScalar(s).applyQuaternion(q);
      v.set(m.x + o.x, y + o.y + bob, m.z + o.z);
      q2.setFromAxisAngle(xAxis, graze * 0.95 - 0.15 + Math.sin(t * 2 + i) * 0.03 * graze);
      m4.compose(v, q.clone().multiply(q2), sc.set(s, s, s));
      h.setMatrixAt(i, m4);

      // legs: diagonal pairs step together
      LEG_OFFSETS.forEach(([lx, ly, lz], l) => {
        o.set(lx, ly, lz).multiplyScalar(s).applyQuaternion(q);
        v.set(m.x + o.x, y + o.y + bob, m.z + o.z);
        const swing = Math.sin(m.phase + (l === 0 || l === 3 ? 0 : Math.PI)) * 0.45 * m.stride;
        q2.setFromAxisAngle(xAxis, swing);
        m4.compose(v, q.clone().multiply(q2), sc.set(s, s, s));
        lg.setMatrixAt(i * 4 + l, m4);
      });
    });
    for (const mesh of [b, gm, h, lg]) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodies} args={[geo.body, undefined, sheepIdx.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={goats} args={[geo.goatBody, undefined, goatIdx.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[geo.head, undefined, count]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[geo.leg, undefined, count * 4]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
}

// ---------------------------------------------------------------- Bactrian camels

let camelGeo: { body: THREE.BufferGeometry; neck: THREE.BufferGeometry; leg: THREE.BufferGeometry } | null = null;
function camelGeometry() {
  if (camelGeo) return camelGeo;
  const fur = new THREE.Color('#a8835a');
  const dark = new THREE.Color('#6e5034');
  // shaggy darker humps and neck fringe, lighter flanks
  const color = (p: THREE.Vector3, _t: number, a: number, out: THREE.Color) => {
    out.copy(fur).lerp(dark, Math.max(0, Math.sin(a)) * Math.max(0, (p.y - 1.55) * 2.2));
  };
  const body = loft(
    [
      { p: [0, 1.32, -0.85], rx: 0.1, ryT: 0.1 },
      { p: [0, 1.38, -0.65], rx: 0.3, ryT: 0.28, ryB: 0.32 },
      { p: [0, 1.4, -0.4], rx: 0.34, ryT: 0.62, ryB: 0.36 }, // rear hump
      { p: [0, 1.38, -0.1], rx: 0.35, ryT: 0.34, ryB: 0.38 }, // saddle between humps
      { p: [0, 1.42, 0.2], rx: 0.34, ryT: 0.66, ryB: 0.38 }, // front hump
      { p: [0, 1.36, 0.5], rx: 0.3, ryT: 0.3, ryB: 0.4 },
      { p: [0, 1.25, 0.72], rx: 0.2, ryT: 0.2, ryB: 0.3 },
      { p: [0, 1.22, 0.8], rx: 0.08, ryT: 0.08 },
    ],
    { radial: 20, steps: 6, color }
  );
  const neckColor = (_p: THREE.Vector3, t: number, a: number, out: THREE.Color) => {
    out.copy(fur);
    if (Math.sin(a) < -0.3 && t < 0.6) out.lerp(dark, 0.6); // throat fringe
  };
  const neck = loft(
    [
      { p: [0, 0.05, -0.05], rx: 0.18, ryT: 0.2 },
      { p: [0, -0.15, 0.25], rx: 0.13, ryT: 0.15, ryB: 0.2 },
      { p: [0, -0.1, 0.5], rx: 0.1, ryT: 0.12, ryB: 0.15 },
      { p: [0, 0.2, 0.62], rx: 0.09, ryT: 0.1 },
      { p: [0, 0.38, 0.7], rx: 0.1, ryT: 0.11 }, // skull
      { p: [0, 0.36, 0.92], rx: 0.07, ryT: 0.08 }, // muzzle
      { p: [0, 0.33, 0.98], rx: 0.05, ryT: 0.05 },
    ],
    { radial: 16, steps: 6, color: neckColor, up: [0, 1, -0.3] }
  );
  const leg = loft(
    [
      { p: [0, 0.1, 0], rx: 0.14, ryT: 0.16 },
      { p: [0, -0.3, 0], rx: 0.09, ryT: 0.1 },
      { p: [0, -0.62, 0], rx: 0.07, ryT: 0.075 }, // knee
      { p: [0, -1.0, 0.0], rx: 0.05, ryT: 0.055 },
      { p: [0, -1.16, 0.03], rx: 0.09, ryT: 0.1 }, // broad padded foot
      { p: [0, -1.2, 0.04], rx: 0.09, ryT: 0.06 },
    ],
    { radial: 12, steps: 5, up: [0, 0, 1], color: (_p, t, _a, out) => out.copy(fur).lerp(dark, t > 0.85 ? 0.5 : 0) }
  );
  camelGeo = { body, neck, leg };
  return camelGeo;
}

function Camel({ x, z, rot, seed }: { x: number; z: number; rot: number; seed: number }) {
  const neck = useRef<THREE.Group>(null);
  const geo = useMemo(camelGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  useFrame(({ clock }) => {
    // slow chewing and looking around
    if (neck.current) {
      neck.current.rotation.x = 0.1 + Math.sin(clock.elapsedTime * 0.35 + seed) * 0.12;
      neck.current.rotation.y = Math.sin(clock.elapsedTime * 0.2 + seed * 2) * 0.35;
    }
  });
  return (
    <group position={[x, heightAt(x, z), z]} rotation-y={rot} scale={1.05}>
      <mesh geometry={geo.body} material={mat} castShadow receiveShadow />
      <group ref={neck} position={[0, 1.3, 0.72]}>
        <mesh geometry={geo.neck} material={mat} castShadow />
        {[1, -1].map((sd) => (
          <mesh key={sd} position={[sd * 0.07, 0.47, 0.66]} rotation-z={sd * 0.4}>
            <coneGeometry args={[0.025, 0.07, 6]} />
            <meshStandardMaterial color="#8a6a48" />
          </mesh>
        ))}
      </group>
      {[
        [0.2, 0.55],
        [-0.2, 0.55],
        [0.2, -0.55],
        [-0.2, -0.55],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 1.2, lz]} geometry={geo.leg} material={mat} castShadow />
      ))}
    </group>
  );
}

let camelsRegistered = false;
export function Camels() {
  const { x, z } = LOC.camels;
  if (!camelsRegistered) {
    camelsRegistered = true;
    addStatic([
      ...bodyCircles(x, z, 0.8, 0.85, 0.5, 3),
      ...bodyCircles(x + 4, z + 2.5, 2.2, 0.85, 0.5, 3),
      ...bodyCircles(x - 3, z + 4, -0.6, 0.85, 0.5, 3),
    ]);
  }
  return (
    <>
      <Camel x={x} z={z} rot={0.8} seed={1} />
      <Camel x={x + 4} z={z + 2.5} rot={2.2} seed={2} />
      <Camel x={x - 3} z={z + 4} rot={-0.6} seed={3} />
    </>
  );
}
