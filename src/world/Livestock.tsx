'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loft } from '@/game/geo';
import { addStatic, bodyCircles, setMover } from '@/game/colliders';
import { heightAt, isInRiver } from '@/game/terrain';
import { useGame, world } from '@/game/store';
import { LEG_OFFSETS, sheepGeometry } from './Animals';

// Livestock you work with: the dairy cows (milking) and the sheep you herd into
// the pen and shear.

// ---------------------------------------------------------------- cattle

export const COWS = [
  { x: 12.5, z: -6.5, heading: -2.3, coat: '#2a221e', patch: '#ece6d8', scale: 1 },
  { x: 14.8, z: -4.6, heading: -2.5, coat: '#7a4a2a', patch: '#ece6d8', scale: 0.96 },
];
export const CALF = { x: 13.6, z: -9.2, heading: -1.6 };
/** the tether line (зэл) the cows and calf are tied along */
export const ZEL = { x0: 10.5, z0: -9.5, x1: 17, z1: -3.5 };

const cowCache = new Map<string, { body: THREE.BufferGeometry; head: THREE.BufferGeometry; leg: THREE.BufferGeometry }>();
function cowGeometry(coat: string, patch: string) {
  const key = coat + patch;
  const hit = cowCache.get(key);
  if (hit) return hit;
  const c0 = new THREE.Color(coat);
  const c1 = new THREE.Color(patch);
  // irregular white patches (pinto) and a pale belly
  const bodyColor = (p: THREE.Vector3, _t: number, a: number, out: THREE.Color) => {
    const n = Math.sin(p.z * 6.1 + 1.3) * Math.sin(p.y * 7.3 + p.x * 3.1) + Math.sin(p.z * 2.3 - p.x * 5.0) * 0.6;
    out.copy(c0).lerp(c1, n > 0.55 ? 1 : 0);
    if (Math.sin(a) < -0.6) out.lerp(c1, 0.5);
  };
  const body = loft(
    [
      { p: [0, 1.0, -0.78], rx: 0.1, ryT: 0.1 },
      { p: [0, 1.04, -0.66], rx: 0.27, ryT: 0.16, ryB: 0.28 }, // pin bones / rump
      { p: [0, 1.02, -0.36], rx: 0.33, ryT: 0.18, ryB: 0.4 }, // deep barrel
      { p: [0, 1.02, 0.0], rx: 0.36, ryT: 0.2, ryB: 0.44 },
      { p: [0, 1.06, 0.34], rx: 0.31, ryT: 0.22, ryB: 0.42 },
      { p: [0, 1.0, 0.58], rx: 0.22, ryT: 0.2, ryB: 0.38 }, // chest + dewlap
      { p: [0, 0.96, 0.7], rx: 0.1, ryT: 0.1, ryB: 0.14 },
    ],
    { radial: 20, steps: 6, color: bodyColor }
  );
  const head = loft(
    [
      { p: [0, 0.0, -0.05], rx: 0.17, ryT: 0.2, ryB: 0.24 }, // neck root
      { p: [0, 0.06, 0.15], rx: 0.13, ryT: 0.14, ryB: 0.18 },
      { p: [0, 0.1, 0.3], rx: 0.12, ryT: 0.11, ryB: 0.12 }, // poll / broad forehead
      { p: [0, 0.02, 0.45], rx: 0.1, ryT: 0.09, ryB: 0.08 },
      { p: [0, -0.06, 0.56], rx: 0.085, ryT: 0.07, ryB: 0.07 }, // muzzle
      { p: [0, -0.08, 0.6], rx: 0.06, ryT: 0.05 },
    ],
    { radial: 16, steps: 5, color: (p, t, a, out) => (t > 0.85 ? out.set('#3a2a26') : bodyColor(p, t, a, out)), up: [0, 1, -0.2] }
  );
  const leg = loft(
    [
      { p: [0, 0.12, 0], rx: 0.1, ryT: 0.12 },
      { p: [0, -0.2, 0], rx: 0.07, ryT: 0.08 },
      { p: [0, -0.42, 0], rx: 0.055, ryT: 0.06 }, // knee
      { p: [0, -0.72, 0.0], rx: 0.04, ryT: 0.045 },
      { p: [0, -0.8, 0.02], rx: 0.055, ryT: 0.05 }, // cloven hoof
      { p: [0, -0.84, 0.03], rx: 0.05, ryT: 0.03 },
    ],
    { radial: 10, steps: 4, up: [0, 0, 1], color: (_p, t, _a, out) => out.copy(c0).lerp(c1, t > 0.5 && t < 0.8 ? 0.6 : 0).lerp(new THREE.Color('#1c1612'), t > 0.82 ? 1 : 0) }
  );
  const g = { body, head, leg };
  cowCache.set(key, g);
  return g;
}

function Cow({ x, z, heading, coat, patch, scale, seed }: { x: number; z: number; heading: number; coat: string; patch: string; scale: number; seed: number }) {
  const neck = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const geo = useMemo(() => cowGeometry(coat, patch), [coat, patch]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), []);
  const horn = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.5 }), []);
  const pink = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d79a8e', roughness: 0.6 }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 7;
    // graze slowly, lift the head to chew and look around
    const graze = 0.5 + 0.5 * Math.sin(t * 0.18);
    if (neck.current) {
      neck.current.rotation.x = graze * 0.75 - 0.1;
      neck.current.rotation.y = Math.sin(t * 0.23) * 0.25 * (1 - graze);
    }
    if (jaw.current) jaw.current.rotation.z = Math.sin(t * 3.2) * 0.05;
    if (tail.current) tail.current.rotation.z = Math.sin(t * 1.7) * 0.25 + Math.sin(t * 7) * 0.08 * Math.max(0, Math.sin(t * 0.5));
  });
  return (
    <group position={[x, heightAt(x, z), z]} rotation-y={heading} scale={scale}>
      <mesh geometry={geo.body} material={mat} castShadow receiveShadow />
      {/* udder with teats, where the milking happens */}
      <mesh position={[0, 0.6, -0.36]} scale={[0.17, 0.12, 0.17]} material={pink}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      {[
        [0.06, -0.3],
        [-0.06, -0.3],
        [0.06, -0.42],
        [-0.06, -0.42],
      ].map(([tx, tz], i) => (
        <mesh key={i} position={[tx, 0.49, tz]} material={pink}>
          <cylinderGeometry args={[0.012, 0.016, 0.06, 6]} />
        </mesh>
      ))}
      <group ref={neck} position={[0, 1.14, 0.62]}>
        <group ref={jaw}>
          <mesh geometry={geo.head} material={mat} castShadow />
        </group>
        {/* short curved horns and ears */}
        {[1, -1].map((sd) => (
          <group key={sd}>
            <mesh position={[sd * 0.12, 0.2, 0.3]} rotation={[0.3, 0, sd * -1.1]} material={horn}>
              <coneGeometry args={[0.025, 0.18, 8]} />
            </mesh>
            <mesh position={[sd * 0.17, 0.11, 0.26]} rotation={[0, 0, sd * -1.3]} scale={[0.05, 0.1, 0.03]} material={mat}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          </group>
        ))}
        {[1, -1].map((sd) => (
          <mesh key={sd} position={[sd * 0.095, 0.08, 0.42]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color="#0c0a09" roughness={0.15} />
          </mesh>
        ))}
      </group>
      {/* tail with a switch */}
      <group ref={tail} position={[0, 1.08, -0.8]}>
        <mesh position={[0, -0.32, -0.02]} material={mat}>
          <cylinderGeometry args={[0.02, 0.025, 0.62, 6]} />
        </mesh>
        <mesh position={[0, -0.68, -0.02]}>
          <coneGeometry args={[0.05, 0.16, 8]} />
          <meshStandardMaterial color="#1c1612" roughness={0.9} />
        </mesh>
      </group>
      {[
        [0.19, 0.48],
        [-0.19, 0.48],
        [0.19, -0.5],
        [-0.19, -0.5],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.84, lz]} geometry={geo.leg} material={mat} castShadow />
      ))}
    </group>
  );
}

let cattleRegistered = false;
export function Cattle() {
  if (!cattleRegistered) {
    cattleRegistered = true;
    addStatic([
      ...COWS.flatMap((c) => bodyCircles(c.x, c.z, c.heading, 0.55, 0.45, 3)),
      ...bodyCircles(CALF.x, CALF.z, CALF.heading, 0.35, 0.3, 2),
      { x: ZEL.x0, z: ZEL.z0, r: 0.1 },
      { x: ZEL.x1, z: ZEL.z1, r: 0.1 },
    ]);
  }
  return (
    <group>
      {COWS.map((c, i) => (
        <Cow key={i} {...c} seed={i} />
      ))}
      <Cow x={CALF.x} z={CALF.z} heading={CALF.heading} coat="#7a4a2a" patch="#ece6d8" scale={0.62} seed={5} />
      {/* зэл: ground tether line between two stakes */}
      {[
        [ZEL.x0, ZEL.z0],
        [ZEL.x1, ZEL.z1],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, heightAt(x, z) + 0.2, z]}>
          <cylinderGeometry args={[0.035, 0.045, 0.4, 6]} />
          <meshStandardMaterial color="#6e5034" roughness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[(ZEL.x0 + ZEL.x1) / 2, heightAt((ZEL.x0 + ZEL.x1) / 2, (ZEL.z0 + ZEL.z1) / 2) + 0.12, (ZEL.z0 + ZEL.z1) / 2]}
        rotation={[Math.PI / 2, 0, Math.atan2(ZEL.x1 - ZEL.x0, ZEL.z1 - ZEL.z0)]}
      >
        <cylinderGeometry args={[0.012, 0.012, Math.hypot(ZEL.x1 - ZEL.x0, ZEL.z1 - ZEL.z0), 4]} />
        <meshStandardMaterial color="#5e4a34" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- herding sheep

export const PEN = { x: -15, z: -9, r: 5.5 };
const GATE_HALF = ((Math.PI * 2) / 26) * 0.95; // half angle of the gate gap (east side)

/** Can a sheep step from (x0,z0) to (x1,z1)? The fence is solid except at an open gate. */
export function fenceAllows(x0: number, z0: number, x1: number, z1: number, gateOpen: boolean) {
  const d0 = Math.hypot(x0 - PEN.x, z0 - PEN.z);
  const d1 = Math.hypot(x1 - PEN.x, z1 - PEN.z);
  if ((d0 < PEN.r) === (d1 < PEN.r)) return true; // not crossing the fence line
  const a = Math.atan2(z1 - PEN.z, x1 - PEN.x);
  return gateOpen && Math.abs(a) < GATE_HALF;
}

export interface HerdSheep {
  x: number;
  z: number;
  heading: number;
  phase: number;
  stride: number;
  resident: boolean; // lives in the pen (for shearing)
  sheared: boolean;
  penned: boolean;
  goat: boolean;
}

const LOOSE_HOME = { x: 10, z: -24 };

/** shared with the player (shearing target, objective marker) */
export const herd: HerdSheep[] = [];

export function Herd() {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(sheepGeometry, []);
  const N = 7;

  const phase = useGame((st) => st.phase);
  // (re)build the herd when a journey starts, so a loaded save's penned sheep are in the pen
  useMemo(() => {
    if (phase !== 'title' && phase !== 'entering') return;
    herd.length = 0;
    const s = useGame.getState();
    const alreadyPenned = Math.min(5, s.penned);
    const shorn = s.activitiesDone.includes('shearing') ? 1 : 0;
    for (let i = 0; i < N; i++) {
      const resident = i < 2;
      const inPen = resident || i - 2 < alreadyPenned;
      const a = i * 2.3;
      const r = inPen ? 1 + (i % 3) * 1.1 : 1.5 + (i % 3) * 1.4;
      const cx = inPen ? PEN.x : LOOSE_HOME.x;
      const cz = inPen ? PEN.z : LOOSE_HOME.z;
      herd.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        heading: a,
        phase: i,
        stride: 0,
        resident,
        sheared: resident && i < shorn,
        penned: inPen,
        goat: i === 4,
      });
    }
  }, [phase]);

  useLayoutEffect(() => {
    const c = new THREE.Color();
    herd.forEach((m, i) => {
      bodies.current?.setColorAt(i, c.set(m.goat ? '#e8e2d6' : '#e9e1cc'));
      heads.current?.setColorAt(i, c.set(m.goat ? '#e8e2d6' : i % 2 ? '#2e241e' : '#7a5a3e'));
      for (let l = 0; l < 4; l++) legs.current?.setColorAt(i * 4 + l, c.set('#3f342a'));
    });
    for (const r of [bodies, heads, legs]) if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
  }, []);

  const tmp = useMemo(
    () => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), v: new THREE.Vector3(), o: new THREE.Vector3(), sc: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), xa: new THREE.Vector3(1, 0, 0) }),
    []
  );

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const b = bodies.current;
    const h = heads.current;
    const lg = legs.current;
    if (!b || !h || !lg) return;
    const s = useGame.getState();
    const gateOpen = s.gateOpen;
    const t = clock.elapsedTime;
    const { m4, q, q2, v, o, sc, up, xa } = tmp;
    const px = world.player.x;
    const pz = world.player.z;
    // the loose sheep stick together: steer toward the centre of the group
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const m of herd) if (!m.resident && !m.penned) {
      cx += m.x;
      cz += m.z;
      n++;
    }
    if (n) {
      cx /= n;
      cz /= n;
    }

    let penned = 0;
    herd.forEach((m, i) => {
      let vx = 0;
      let vz = 0;
      const dpx = m.x - px;
      const dpz = m.z - pz;
      const pd = Math.hypot(dpx, dpz) || 1;
      const inside = Math.hypot(m.x - PEN.x, m.z - PEN.z) < PEN.r;
      if (m.penned || m.resident) {
        // mill about inside the pen
        const wx = PEN.x + Math.cos(t * 0.05 + i * 2.1) * 2.4 - m.x;
        const wz = PEN.z + Math.sin(t * 0.07 + i * 1.7) * 2.4 - m.z;
        vx += wx * 0.15;
        vz += wz * 0.15;
        if (pd < 2.5) {
          vx += (dpx / pd) * 1.2;
          vz += (dpz / pd) * 1.2;
        }
      } else {
        // flee from the herder: the closer, the faster (driving them like a real flock)
        const flee = pd < 9 ? (9 - pd) / 9 : 0;
        vx += (dpx / pd) * flee * 3.2;
        vz += (dpz / pd) * flee * 3.2;
        // cohesion
        vx += (cx - m.x) * 0.25;
        vz += (cz - m.z) * 0.25;
        // when calm, wander back toward their grazing ground
        if (flee === 0) {
          vx += (LOOSE_HOME.x - m.x) * 0.02;
          vz += (LOOSE_HOME.z - m.z) * 0.02;
        }
        // a funnel at an open gate: sheep near the opening drift inside
        const gx = PEN.x + PEN.r + 0.3;
        const gd = Math.hypot(m.x - gx, m.z - PEN.z);
        if (gateOpen && gd < 4 && flee > 0) {
          vx += (PEN.x - m.x) * 0.25;
          vz += (PEN.z - m.z) * 0.25;
        }
      }
      // separation from flock mates
      for (const o2 of herd) {
        if (o2 === m) continue;
        const sx = m.x - o2.x;
        const sz = m.z - o2.z;
        const sd = Math.hypot(sx, sz);
        if (sd > 0 && sd < 0.9) {
          vx += (sx / sd) * (0.9 - sd) * 2;
          vz += (sz / sd) * (0.9 - sd) * 2;
        }
      }
      const sp = Math.min(3.4, Math.hypot(vx, vz));
      if (sp > 0.12) {
        const nx = m.x + (vx / Math.hypot(vx, vz)) * sp * dt;
        const nz = m.z + (vz / Math.hypot(vx, vz)) * sp * dt;
        // fence, ger and river are solid
        const free = (x: number, z: number) => fenceAllows(m.x, m.z, x, z, gateOpen) && Math.hypot(x, z) > 4 && !isInRiver(x, z);
        if (free(nx, nz)) {
          m.x = nx;
          m.z = nz;
        } else if (!m.penned && !m.resident) {
          // pressed against the fence: slide along it, toward the gate if it is open
          const a = Math.atan2(m.z - PEN.z, m.x - PEN.x);
          const dir = gateOpen ? -Math.sign(a) || 1 : Math.sign(Math.sin(Math.atan2(vz, vx) - a)) || 1;
          const ta = a + dir * (sp * dt) / PEN.r;
          const rr = PEN.r + 0.45;
          const tx = PEN.x + Math.cos(ta) * rr;
          const tz = PEN.z + Math.sin(ta) * rr;
          if (free(tx, tz)) {
            m.x = tx;
            m.z = tz;
          }
        }
        let dh = Math.atan2(vx, vz) - m.heading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        m.heading += dh * Math.min(1, dt * 4);
      }
      setMover(`herd.${i}`, m.x, m.z, 0.38);
      m.stride += (sp > 0.3 ? 1 : -1) * dt * 4;
      m.stride = Math.min(1, Math.max(0, m.stride));
      m.phase += dt * (2 + sp * 3.5) * m.stride;
      const nowInside = Math.hypot(m.x - PEN.x, m.z - PEN.z) < PEN.r - 0.3;
      if (!m.resident) {
        m.penned = nowInside || (inside && m.penned);
        if (m.penned) penned++;
      }

      // ---- matrices
      const y = heightAt(m.x, m.z);
      const scl = m.goat ? 0.88 : 1;
      const bob = Math.abs(Math.sin(m.phase)) * 0.025 * m.stride;
      q.setFromAxisAngle(up, m.heading);
      v.set(m.x, y + 0.53 * scl + bob, m.z);
      // a freshly shorn sheep is visibly slimmer
      sc.set(m.sheared ? 0.78 * scl : scl, m.sheared ? 0.8 * scl : scl, m.sheared ? 0.9 * scl : scl);
      m4.compose(v, q, sc);
      b.setMatrixAt(i, m4);
      const graze = sp > 0.3 ? 0 : 0.5 + 0.5 * Math.sin(t * 0.35 + i);
      o.set(0, 0.62 - graze * 0.3, 0.4).multiplyScalar(scl).applyQuaternion(q);
      v.set(m.x + o.x, y + o.y + bob, m.z + o.z);
      q2.setFromAxisAngle(xa, graze * 0.95 - 0.15);
      m4.compose(v, q.clone().multiply(q2), sc.set(scl, scl, scl));
      h.setMatrixAt(i, m4);
      LEG_OFFSETS.forEach(([lx, ly, lz], l) => {
        o.set(lx, ly, lz).multiplyScalar(scl).applyQuaternion(q);
        v.set(m.x + o.x, y + o.y + bob, m.z + o.z);
        q2.setFromAxisAngle(xa, Math.sin(m.phase + (l === 0 || l === 3 ? 0 : Math.PI)) * 0.45 * m.stride);
        m4.compose(v, q.clone().multiply(q2), sc.set(scl, scl, scl));
        lg.setMatrixAt(i * 4 + l, m4);
      });
    });
    for (const mesh of [b, h, lg]) mesh.instanceMatrix.needsUpdate = true;

    if (s.phase === 'play') {
      s.setPenned(penned);
      if (penned >= 5 && s.steps['herd.talk']) s.complete('herd', 'drive');
    }
  });

  return (
    <>
      <instancedMesh ref={bodies} args={[geo.body, undefined, N]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[geo.head, undefined, N]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[geo.leg, undefined, N * 4]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
}
