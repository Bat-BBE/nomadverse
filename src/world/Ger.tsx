'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { doorTexture, feltTexture, roofTexture } from '@/game/textures';
import { heightAt, LOC } from '@/game/terrain';
import { useGame } from '@/game/store';

export const GER = { r: 3.3, wall: 1.6, roofTop: 3.05, toono: 0.62 };

let smokeTex: THREE.Texture | null = null;
export function softDot() {
  if (smokeTex) return smokeTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  smokeTex = new THREE.CanvasTexture(cv);
  return smokeTex;
}

let puffTex: THREE.Texture | null = null;
/** Cloud puff: dense core with a soft but defined edge, so cumulus reads as shapes. */
export function cloudPuff() {
  if (puffTex) return puffTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(64, 58, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.8, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  puffTex = new THREE.CanvasTexture(cv);
  return puffTex;
}

/** Thin smoke trail from a chimney; drifts with the wind (+x). */
export function Smoke({ position, count = 16, scale = 1 }: { position: [number, number, number]; count?: number; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        offset: i / count,
        mat: new THREE.SpriteMaterial({ map: softDot(), color: '#e9e4dc', transparent: true, depthWrite: false, opacity: 0 }),
      })),
    [count]
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime * 0.12;
    g.children.forEach((child, i) => {
      const p = parts[i];
      const life = (t + p.offset) % 1;
      const s = (0.35 + life * 2.2) * scale;
      child.position.set(life * life * 3.5 * scale + Math.sin(life * 6 + i) * 0.15, life * 5 * scale, Math.sin(life * 4 + i * 2) * 0.2);
      child.scale.set(s, s, s);
      p.mat.opacity = Math.sin(life * Math.PI) * 0.32;
    });
  });
  return (
    <group ref={group} position={position}>
      {parts.map((p, i) => (
        <sprite key={i} material={p.mat} />
      ))}
    </group>
  );
}

function Rope({ y, r, color = '#5e4a34' }: { y: number; r: number; color?: string }) {
  return (
    <mesh position-y={y} rotation-x={Math.PI / 2} castShadow>
      <torusGeometry args={[r, 0.022, 5, 72]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/** Rope laid along the roof from the crown down to the eave, then down the wall. */
function RoofRope({ angle }: { angle: number }) {
  const { r, wall, roofTop, toono } = GER;
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const rr = toono + 0.15 + (r + 0.3 - toono - 0.15) * t;
      const y = roofTop + 0.06 - (roofTop - wall) * t + Math.sin(t * Math.PI) * 0.1;
      pts.push(new THREE.Vector3(Math.cos(angle) * rr, y, Math.sin(angle) * rr));
    }
    pts.push(new THREE.Vector3(Math.cos(angle) * (r + 0.13), wall - 0.25, Math.sin(angle) * (r + 0.13)));
    pts.push(new THREE.Vector3(Math.cos(angle) * (r + 0.1), 0.45, Math.sin(angle) * (r + 0.1)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.02, 4);
  }, [angle, r, wall, roofTop, toono]);
  return (
    <mesh geometry={geo} castShadow>
      <meshLambertMaterial color="#5e4a34" />
    </mesh>
  );
}

/** The painted double door: two leaves hinged at the frame, opening outward (south). */
function DoorLeaves() {
  const open = useGame((s) => s.doorOpen);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const halves = useMemo(
    () =>
      [0, 0.5].map((off) => {
        const t = doorTexture().clone();
        t.repeat.set(0.5, 1);
        t.offset.set(off, 0);
        t.needsUpdate = true;
        return new THREE.MeshLambertMaterial({ map: t });
      }),
    []
  );
  useFrame((_, dt) => {
    const target = open ? 1.45 : 0;
    const k = Math.min(1, dt * 5);
    if (left.current) left.current.rotation.y += (-target - left.current.rotation.y) * k;
    if (right.current) right.current.rotation.y += (target - right.current.rotation.y) * k;
  });
  return (
    <>
      <group ref={left} position={[-0.46, 0.8, 0.118]}>
        <mesh position-x={0.23} material={halves[0]} castShadow>
          <boxGeometry args={[0.46, 1.44, 0.025]} />
        </mesh>
      </group>
      <group ref={right} position={[0.46, 0.8, 0.118]}>
        <mesh position-x={-0.23} material={halves[1]} castShadow>
          <boxGeometry args={[0.46, 1.44, 0.025]} />
        </mesh>
      </group>
    </>
  );
}

export function GerExterior({ position = [0, 0, 0] as [number, number, number], main = false }) {
  const felt = useMemo(() => {
    const t = feltTexture().clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  const roof = useMemo(() => {
    const t = roofTexture().clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  const { r, wall, roofTop, toono } = GER;

  // Soft, slightly bulging felt over the lattice and a gently convex roof
  const wallGeo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector2(r + 0.04 + Math.sin(t * Math.PI) * 0.05 - t * 0.02, t * wall));
    }
    return new THREE.LatheGeometry(pts, 64);
  }, [r, wall]);
  const roofGeo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const rr = r + 0.28 - (r + 0.28 - toono - 0.06) * t;
      const y = wall - 0.06 + (roofTop - wall + 0.06) * t + Math.sin(t * Math.PI) * 0.08;
      pts.push(new THREE.Vector2(rr, y));
    }
    return new THREE.LatheGeometry(pts, 64);
  }, [r, wall, roofTop, toono]);

  return (
    <group position={position}>
      {/* felt walls */}
      <mesh geometry={wallGeo} castShadow receiveShadow>
        <meshStandardMaterial map={felt} bumpMap={felt} bumpScale={0.8} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* хаяавч: darker skirt around the base */}
      <mesh position-y={0.13}>
        <cylinderGeometry args={[r + 0.1, r + 0.16, 0.26, 64, 1, true]} />
        <meshLambertMaterial color="#77705f" side={THREE.DoubleSide} />
      </mesh>
      {/* roof */}
      <mesh geometry={roofGeo} castShadow receiveShadow>
        <meshStandardMaterial map={roof} bumpMap={roof} bumpScale={0.6} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* toono crown */}
      <mesh position-y={roofTop + 0.04} rotation-x={Math.PI / 2}>
        <torusGeometry args={[toono, 0.08, 6, 32]} />
        <meshLambertMaterial color="#b44e1c" />
      </mesh>
      {/* өрх: square top cover, folded half open on the south side */}
      <group position-y={roofTop + 0.1}>
        <mesh position={[0, 0, -0.3]} rotation-x={-0.08} castShadow>
          <boxGeometry args={[1.9, 0.03, 1.3]} />
          <meshLambertMaterial color="#ece4d4" />
        </mesh>
        <mesh position={[0, 0.03, 0.32]} rotation-x={-0.08}>
          <boxGeometry args={[1.94, 0.02, 0.08]} />
          <meshLambertMaterial color="#2f5f9a" />
        </mesh>
      </group>
      {[0.6, 2.55, 3.75, 5.65].map((a) => (
        <RoofRope key={a} angle={a} />
      ))}
      {/* chimney */}
      <mesh position={[0.25, roofTop + 0.45, 0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.1, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0.25, roofTop + 1.02, 0.3]}>
        <cylinderGeometry args={[0.1, 0.08, 0.06, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <Smoke position={[0.25, roofTop + 1.05, 0.3]} />

      {/* бүслүүр: three belts around the wall */}
      <Rope y={0.42} r={r + 0.08} />
      <Rope y={0.95} r={r + 0.09} />
      <Rope y={wall - 0.12} r={r + 0.07} />

      {/* door facing south (+z): frame posts, lintel, painted leaves, rolled felt flap */}
      <group position={[0, 0, r + 0.03]}>
        <mesh position={[0, 0.82, 0.04]} castShadow>
          <boxGeometry args={[1.18, 1.64, 0.14]} />
          <meshLambertMaterial color="#8e3912" />
        </mesh>
        {[-0.51, 0.51].map((x) => (
          <mesh key={x} position={[x, 0.82, 0.13]}>
            <boxGeometry args={[0.1, 1.64, 0.06]} />
            <meshLambertMaterial color="#d26a24" />
          </mesh>
        ))}
        <mesh position={[0, 1.6, 0.13]}>
          <boxGeometry args={[1.22, 0.1, 0.07]} />
          <meshLambertMaterial color="#d26a24" />
        </mesh>
        {/* dark doorway behind the leaves */}
        <mesh position={[0, 0.8, 0.113]}>
          <planeGeometry args={[0.92, 1.44]} />
          <meshBasicMaterial color="#1a0f08" />
        </mesh>
        {main ? <DoorLeaves /> : (
          <mesh position={[0, 0.8, 0.115]}>
            <planeGeometry args={[0.92, 1.44]} />
            <meshLambertMaterial map={doorTexture()} />
          </mesh>
        )}
        {/* threshold (босго) */}
        <mesh position={[0, 0.06, 0.14]}>
          <boxGeometry args={[1.18, 0.12, 0.22]} />
          <meshLambertMaterial color="#6e2c0e" />
        </mesh>
        {/* үүдэвч: felt door curtain rolled up above the door */}
        <mesh position={[0, 1.72, 0.2]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 1.2, 12]} />
          <meshLambertMaterial color="#e2d8c4" />
        </mesh>
        <mesh position={[0, 1.72, 0.2]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.093, 0.093, 0.18, 12]} />
          <meshLambertMaterial color="#2f5f9a" />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- camp props

function Cart({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) {
  const wood = '#8a6440';
  return (
    <group position={position} rotation-y={rot}>
      <mesh position-y={0.85} castShadow>
        <boxGeometry args={[1.2, 0.12, 2.0]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <group key={x} position={[x * 1.05, 0.62, 0]} rotation-y={Math.PI / 2}>
          <mesh castShadow>
            <torusGeometry args={[0.58, 0.045, 6, 28]} />
            <meshStandardMaterial color="#5c412a" roughness={0.85} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} rotation-z={(k / 6) * Math.PI} castShadow>
              <boxGeometry args={[0.035, 1.12, 0.03]} />
              <meshStandardMaterial color="#6e5034" roughness={0.85} />
            </mesh>
          ))}
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.09, 0.09, 0.16, 12]} />
            <meshStandardMaterial color="#4a3422" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.55, 1.9]} rotation-x={0.28} castShadow>
          <boxGeometry args={[0.07, 0.07, 2.2]} />
          <meshLambertMaterial color={wood} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 1.3, 6]} />
        <meshLambertMaterial color="#5c412a" />
      </mesh>
    </group>
  );
}

function ArgalPile({ x, z }: { x: number; z: number }) {
  const pieces = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const layer = Math.floor(i / 9);
      const a = i * 2.4;
      const rr = 0.55 - layer * 0.18;
      out.push([Math.cos(a) * rr * Math.random(), 0.08 + layer * 0.13, Math.sin(a) * rr * Math.random(), a]);
    }
    return out;
  }, []);
  return (
    <group position={[x, heightAt(x, z), z]}>
      {pieces.map(([px, py, pz, a], i) => (
        <mesh key={i} position={[px, py, pz]} rotation={[0.3, a, 0.2]} scale={[0.22, 0.07, 0.18]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={i % 3 ? '#6f5a3e' : '#80694a'} flatShading />
        </mesh>
      ))}
    </group>
  );
}

let staveTex: THREE.CanvasTexture | null = null;
/** vertical wooden staves with grain, for the barrel and bucket */
function staves() {
  if (staveTex) return staveTex;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    const l = 0.85 + Math.random() * 0.25;
    g.fillStyle = `rgb(${Math.round(150 * l)},${Math.round(104 * l)},${Math.round(62 * l)})`;
    g.fillRect(i * 16, 0, 16, 64);
    g.fillStyle = 'rgba(60,35,18,0.55)';
    g.fillRect(i * 16, 0, 1.5, 64);
    for (let k = 0; k < 5; k++) {
      g.fillStyle = 'rgba(90,55,28,0.25)';
      g.fillRect(i * 16 + 3 + Math.random() * 10, 0, 1, 64);
    }
  }
  staveTex = new THREE.CanvasTexture(cv);
  staveTex.wrapS = THREE.RepeatWrapping;
  staveTex.colorSpace = THREE.SRGBColorSpace;
  return staveTex;
}

/** Wooden barrel (торх) for water/milk with iron hoops, and a wooden bucket (хувин). */
function WaterVessels({ x, z }: { x: number; z: number }) {
  const geo = useMemo(() => {
    // bulging barrel profile
    const barrel = new THREE.LatheGeometry(
      Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return new THREE.Vector2(0.22 + Math.sin(t * Math.PI) * 0.04, t * 0.62);
      }),
      24
    );
    const bucket = new THREE.LatheGeometry(
      [
        [0.13, 0.0],
        [0.15, 0.3],
        [0.155, 0.32],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      20
    );
    return { barrel, bucket };
  }, []);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: staves(), bumpMap: staves(), bumpScale: 0.5, roughness: 0.85, side: THREE.DoubleSide }), []);
  const iron = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3c3a38', roughness: 0.6, metalness: 0.6 }), []);
  const lid = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a5e36', roughness: 0.8 }), []);
  return (
    <group position={[x, 0, z]}>
      {/* торх */}
      <mesh geometry={geo.barrel} material={wood} castShadow receiveShadow />
      {[0.08, 0.31, 0.54].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2} material={iron}>
          <torusGeometry args={[0.226 + Math.sin((y / 0.62) * Math.PI) * 0.04, 0.012, 4, 28]} />
        </mesh>
      ))}
      <mesh position-y={0.6} material={lid}>
        <cylinderGeometry args={[0.215, 0.215, 0.03, 24]} />
      </mesh>
      {/* wooden ladle (шанага) resting on the lid */}
      <mesh position={[0.05, 0.63, 0]} rotation-z={Math.PI / 2} material={lid}>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
      </mesh>
      {/* хувин: wooden bucket with an iron hoop and rope handle */}
      <group position={[0.5, 0, 0.15]}>
        <mesh geometry={geo.bucket} material={wood} castShadow receiveShadow />
        <mesh position-y={0.005} rotation-x={-Math.PI / 2} material={lid}>
          <circleGeometry args={[0.13, 20]} />
        </mesh>
        <mesh position-y={0.24} rotation-x={Math.PI / 2} material={iron}>
          <torusGeometry args={[0.15, 0.009, 4, 24]} />
        </mesh>
        <mesh position-y={0.32} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.15, 0.008, 4, 16, Math.PI]} />
          <meshStandardMaterial color="#b49a6a" roughness={0.9} />
        </mesh>
        {/* water inside */}
        <mesh position-y={0.27} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.145, 20]} />
          <meshStandardMaterial color="#4f6a6e" roughness={0.15} metalness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function HitchLine() {
  const { x, z } = LOC.hitch;
  return (
    <group position={[x, 0, z]}>
      {[-1.8, 1.8].map((dz) => (
        <mesh key={dz} position={[0, 0.7, dz]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.4, 6]} />
          <meshLambertMaterial color="#7a5a3a" />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 3.6, 4]} />
        <meshLambertMaterial color="#4e3a26" />
      </mesh>
    </group>
  );
}

/** Wooden livestock pen (хашаа): posts following the ground with two rails. */
function Pen({ cx, cz, r }: { cx: number; cz: number; r: number }) {
  const { posts, rails } = useMemo(() => {
    const posts: { p: [number, number, number]; h: number }[] = [];
    const rails: { p: [number, number, number]; rot: [number, number, number]; len: number }[] = [];
    const n = 26;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (i === 0) continue; // gate gap
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const y = heightAt(x, z);
      const h = 1.1 + Math.sin(i * 7.3) * 0.08;
      posts.push({ p: [x, y + h / 2, z], h });
      pts.push(new THREE.Vector3(x, y, z));
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const pitch = Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z));
      for (const hh of [0.45, 0.9]) rails.push({ p: [mid.x, mid.y + hh, mid.z], rot: [-pitch, yaw, 0], len: len + 0.1 });
    }
    return { posts, rails };
  }, [cx, cz, r]);
  const gateOpen = useGame((s) => s.gateOpen);
  const gate = useRef<THREE.Group>(null);
  // the gate spans the gap between the posts either side of angle 0
  const hinge = useMemo(() => {
    const a = (1 / 26) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const x2 = cx + Math.cos(-a) * r;
    const z2 = cz + Math.sin(-a) * r;
    return { x, z, y: heightAt(x, z), len: Math.hypot(x2 - x, z2 - z), yaw: Math.atan2(x2 - x, z2 - z) };
  }, [cx, cz, r]);
  useFrame((_, dt) => {
    if (gate.current) gate.current.rotation.y += ((hinge.yaw + (gateOpen ? -1.6 : 0)) - gate.current.rotation.y) * Math.min(1, dt * 4);
  });
  return (
    <group>
      <group ref={gate} position={[hinge.x, hinge.y, hinge.z]} rotation-y={hinge.yaw}>
        {[0.35, 0.8].map((h) => (
          <mesh key={h} position={[0, h, hinge.len / 2]} castShadow>
            <boxGeometry args={[0.05, 0.08, hinge.len]} />
            <meshStandardMaterial color="#8a6a46" roughness={0.85} />
          </mesh>
        ))}
        {[0.1, 0.5, 0.9].map((t) => (
          <mesh key={t} position={[0, 0.58, hinge.len * t]} castShadow>
            <boxGeometry args={[0.05, 0.62, 0.05]} />
            <meshStandardMaterial color="#7a5c3c" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 0.58, hinge.len * 0.5]} rotation-x={Math.atan2(0.5, hinge.len)}>
          <boxGeometry args={[0.04, 0.05, Math.hypot(hinge.len * 0.8, 0.5)]} />
          <meshStandardMaterial color="#7a5c3c" roughness={0.85} />
        </mesh>
      </group>
      {posts.map((p, i) => (
        <mesh key={i} position={p.p} castShadow>
          <cylinderGeometry args={[0.05, 0.06, p.h, 6]} />
          <meshLambertMaterial color={i % 3 ? '#7a6248' : '#6a543c'} />
        </mesh>
      ))}
      {rails.map((r, i) => (
        <mesh key={i} position={r.p} rotation={r.rot} castShadow>
          <boxGeometry args={[0.05, 0.07, r.len]} />
          <meshLambertMaterial color="#8a7050" />
        </mesh>
      ))}
    </group>
  );
}

/** Distant neighbouring household (саахалт айл). */
function Neighbour({ x, z, rot }: { x: number; z: number; rot: number }) {
  const y = heightAt(x, z);
  return (
    <group position={[x, y - 0.05, z]} rotation-y={rot}>
      <GerExterior />
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[3.6, 3.8, 0.9, 32]} />
        <meshLambertMaterial color="#77705f" />
      </mesh>
      <group position={[6, 0, 2]} rotation-y={1.2}>
        <Cart position={[0, 0, 0]} />
      </group>
    </group>
  );
}

export function Camp() {
  return (
    <group>
      <GerExterior main />
      <Pen cx={-15} cz={-9} r={5.5} />
      <Neighbour x={96} z={8} rot={-0.3} />
      <Neighbour x={-52} z={62} rot={0.4} />
      <Cart position={[-6.5, 0, -2.5]} rot={0.6} />
      <ArgalPile x={LOC.argal.x} z={LOC.argal.z} />
      <WaterVessels x={3.6} z={3.4} />
      <HitchLine />
    </group>
  );
}

// ---------------------------------------------------------------- Ovoo

export function Ovoo() {
  const extra = useGame((s) => !!s.steps['ovoo.stone']);
  const { x, z } = LOC.ovoo;
  const y = heightAt(x, z);
  const stones = useMemo(() => {
    const out: { p: [number, number, number]; s: number; r: number }[] = [];
    let seed = 3;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 90; i++) {
      const h = rnd();
      const rr = (1 - h) * 1.7 * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      out.push({ p: [Math.cos(a) * rr, h * 1.7, Math.sin(a) * rr], s: 0.18 + rnd() * 0.22, r: rnd() * 3 });
    }
    return out;
  }, []);
  return (
    <group position={[x, y - 0.1, z]}>
      {stones.map((s, i) => (
        <mesh key={i} position={s.p} rotation={[s.r, s.r * 2, s.r]} scale={s.s} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={i % 4 ? '#8c877b' : '#a39e90'} flatShading />
        </mesh>
      ))}
      {extra && (
        <mesh position={[0.25, 1.95, 0.1]} scale={0.22}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color="#c9c2b0" flatShading />
        </mesh>
      )}
      {/* central wooden pole */}
      <mesh position-y={2.6} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
        <meshLambertMaterial color="#7a5a3a" />
      </mesh>
    </group>
  );
}
