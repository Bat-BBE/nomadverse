'use client';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loft, type LoftKey } from '@/game/geo';

// Mongolian horse (~1.3 m at the withers): short legs, deep barrel, thick
// neck, large convex head, long mane and tail. Body, neck+head and each leg
// are single lofted surfaces, so the silhouette reads as one animal rather than
// assembled primitives. Faces +z, hooves at y = 0.

export interface HorseAnim {
  speed: number; // m/s, drives gait
  graze: number; // 0..1 target head-down amount
  look: number; // head turn (radians)
}

export interface HorseHandle {
  anim: HorseAnim;
  group: THREE.Group | null;
}

interface HorseProps {
  coat?: string;
  mane?: string;
  points?: string; // darker lower legs (bay/dun "points")
  saddled?: boolean;
  position?: [number, number, number];
  rotation?: number;
  seed?: number;
}

// Mane locks laid along the crest of the neck (neck pivot space), tilted to fall to one side.
const MANE = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12;
  const r = (k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    p: [0.06 + r(1) * 0.025, 0.1 + t * 0.44, -0.12 + t * 0.48] as [number, number, number],
    r: [0.62 + (r(2) - 0.5) * 0.25, 0, 0.45 + r(3) * 0.35] as [number, number, number],
    len: 0.18 + r(4) * 0.12,
  };
});

// ---- shared geometry builders (cached per coat)

const BODY_KEYS: LoftKey[] = [
  { p: [0, 1.12, -0.8], rx: 0.07, ryT: 0.06, ryB: 0.07 },
  { p: [0, 1.13, -0.68], rx: 0.24, ryT: 0.12, ryB: 0.24 }, // point of the croup
  { p: [0, 1.1, -0.46], rx: 0.3, ryT: 0.17, ryB: 0.36 }, // hindquarters
  { p: [0, 1.06, -0.15], rx: 0.31, ryT: 0.2, ryB: 0.37 }, // flank
  { p: [0, 1.06, 0.15], rx: 0.32, ryT: 0.22, ryB: 0.39 }, // barrel (deep belly)
  { p: [0, 1.11, 0.4], rx: 0.27, ryT: 0.23, ryB: 0.37 }, // withers / girth
  { p: [0, 1.06, 0.6], rx: 0.22, ryT: 0.22, ryB: 0.34 }, // shoulder
  { p: [0, 0.98, 0.74], rx: 0.15, ryT: 0.16, ryB: 0.22 }, // chest
  { p: [0, 0.96, 0.8], rx: 0.06, ryT: 0.06, ryB: 0.08 },
];

// neck + head in neck-pivot space (pivot at the withers)
const NECK_KEYS: LoftKey[] = [
  { p: [0, -0.12, -0.08], rx: 0.2, ryT: 0.24, ryB: 0.28 },
  { p: [0, 0.08, 0.1], rx: 0.16, ryT: 0.17, ryB: 0.22 },
  { p: [0, 0.28, 0.26], rx: 0.12, ryT: 0.13, ryB: 0.16 },
  { p: [0, 0.45, 0.38], rx: 0.1, ryT: 0.1, ryB: 0.14 }, // throatlatch
  { p: [0, 0.52, 0.47], rx: 0.1, ryT: 0.085, ryB: 0.13 }, // poll / jowl
  { p: [0, 0.46, 0.6], rx: 0.105, ryT: 0.08, ryB: 0.11 }, // forehead, wide cheeks
  { p: [0, 0.35, 0.73], rx: 0.075, ryT: 0.065, ryB: 0.075 }, // nasal bone
  { p: [0, 0.25, 0.83], rx: 0.07, ryT: 0.06, ryB: 0.07 }, // muzzle
  { p: [0, 0.21, 0.87], rx: 0.05, ryT: 0.04, ryB: 0.05 },
];

function legKeys(front: boolean): { upper: LoftKey[]; lower: LoftKey[] } {
  return front
    ? {
        upper: [
          { p: [0, 0.12, 0.02], rx: 0.1, ryT: 0.13 },
          { p: [0, -0.06, 0.0], rx: 0.09, ryT: 0.1 },
          { p: [0, -0.25, 0.0], rx: 0.065, ryT: 0.07 }, // forearm
          { p: [0, -0.42, 0.0], rx: 0.06, ryT: 0.06 }, // knee
        ],
        lower: [
          { p: [0, 0.02, 0.0], rx: 0.058, ryT: 0.06 },
          { p: [0, -0.15, 0.0], rx: 0.04, ryT: 0.045 }, // cannon
          { p: [0, -0.33, 0.005], rx: 0.045, ryT: 0.052 }, // fetlock
          { p: [0, -0.41, 0.03], rx: 0.04, ryT: 0.042 }, // pastern
        ],
      }
    : {
        upper: [
          { p: [0, 0.15, 0.04], rx: 0.13, ryT: 0.17 },
          { p: [0, -0.08, -0.02], rx: 0.11, ryT: 0.13 }, // gaskin
          { p: [0, -0.28, -0.06], rx: 0.07, ryT: 0.08 },
          { p: [0, -0.42, -0.06], rx: 0.055, ryT: 0.065 }, // hock
        ],
        lower: [
          { p: [0, 0.02, 0.0], rx: 0.055, ryT: 0.065 },
          { p: [0, -0.15, 0.0], rx: 0.04, ryT: 0.047 },
          { p: [0, -0.33, 0.005], rx: 0.045, ryT: 0.052 },
          { p: [0, -0.41, 0.03], rx: 0.04, ryT: 0.042 },
        ],
      };
}

const geoCache = new Map<string, { body: THREE.BufferGeometry; neck: THREE.BufferGeometry; legs: { upper: THREE.BufferGeometry; lower: THREE.BufferGeometry }[] }>();

function horseGeometry(coat: string, points: string) {
  const key = coat + points;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const base = new THREE.Color(coat);
  const dark = new THREE.Color(points);
  const belly = base.clone().lerp(new THREE.Color('#e8dcc4'), 0.12);
  // subtle muscle shading and lighter belly baked into vertex colours
  const bodyColor = (p: THREE.Vector3, _t: number, a: number, out: THREE.Color) => {
    const under = Math.max(0, -Math.sin(a));
    out.copy(base).lerp(belly, under * 0.6);
    out.multiplyScalar(0.94 + 0.08 * Math.sin(p.z * 9 + p.y * 4));
  };
  const neckColor = (p: THREE.Vector3, t: number, _a: number, out: THREE.Color) => {
    out.copy(base);
    if (t > 0.86) out.lerp(dark, Math.min(1, (t - 0.86) * 6) * 0.75); // dark muzzle
    out.multiplyScalar(0.95 + 0.06 * Math.sin(p.y * 10));
  };
  const legColor = (lowerPart: boolean) => (p: THREE.Vector3, t: number, _a: number, out: THREE.Color) => {
    out.copy(base);
    const k = lowerPart ? 0.4 + t * 0.6 : Math.max(0, t - 0.6) * 1.2;
    out.lerp(dark, Math.min(1, k));
  };
  const g = {
    body: loft(BODY_KEYS, { radial: 22, steps: 6, color: bodyColor, up: [0, 1, 0] }),
    neck: loft(NECK_KEYS, { radial: 18, steps: 6, color: neckColor, up: [0, 1, -0.3] }),
    legs: [true, false].map((front) => {
      const k = legKeys(front);
      return {
        upper: loft(k.upper, { radial: 12, steps: 5, up: [0, 0, 1], color: legColor(false), capStart: false }),
        lower: loft(k.lower, { radial: 10, steps: 5, up: [0, 0, 1], color: legColor(true) }),
      };
    }),
  };
  geoCache.set(key, g);
  return g;
}

const hoofGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.08, 12);
const earGeo = (() => {
  const g = new THREE.ConeGeometry(0.035, 0.13, 8);
  g.scale(1, 1, 0.55);
  return g;
})();

export const HorseModel = forwardRef<HorseHandle, HorseProps>(function HorseModel(
  { coat = '#8a5a34', mane = '#2b1d14', points, saddled = false, position, rotation = 0, seed = 0 },
  ref
) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const ears = useRef<(THREE.Mesh | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const lower = useRef<(THREE.Group | null)[]>([]);
  const anim = useRef<HorseAnim>({ speed: 0, graze: 0, look: 0 });
  const state = useRef({ phase: seed * 10, graze: 0, swish: 0, swishT: 2 + seed, ear: 0, earT: 1 + seed });

  useImperativeHandle(ref, () => ({ anim: anim.current, get group() { return root.current; } }), []);

  const geo = useMemo(() => horseGeometry(coat, points ?? new THREE.Color(mane).lerp(new THREE.Color(coat), 0.35).getStyle()), [coat, mane, points]);
  const coatMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }), []);
  const maneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: mane, roughness: 0.85 }), [mane]);
  const earMat = useMemo(() => new THREE.MeshStandardMaterial({ color: coat, roughness: 0.7 }), [coat]);
  const hoofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.55 }), []);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.1 }), []);
  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b2416', roughness: 0.7 }), []);
  const silverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.25, metalness: 0.9 }), []);
  const bitRef = useRef<THREE.Object3D>(null);
  const reins = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = anim.current;
    const s = state.current;
    const t = clock.elapsedTime;
    const gallop = a.speed > 8;
    const trot = a.speed > 3.5 && !gallop;
    // stride frequency grows with speed (walk ~0.9 Hz, trot ~1.5 Hz, gallop ~2.3 Hz)
    const freq = gallop ? 2.3 : trot ? 1.5 : 0.55 + a.speed * 0.25;
    if (a.speed > 0.15) s.phase += dt * freq * Math.PI * 2;
    s.graze += (a.graze - s.graze) * Math.min(1, dt * 2);

    const moving = a.speed > 0.15;
    const amp = moving ? (gallop ? 0.65 : trot ? 0.48 : 0.34) : 0;
    // walk: 4-beat lateral sequence; trot: diagonal pairs; gallop: rotary
    const offsets = gallop ? [0, 0.12, 0.55, 0.67] : trot ? [0, 0.5, 0.5, 0] : [0, 0.5, 0.75, 0.25];
    const k = Math.min(1, dt * 14);
    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const ph = s.phase + offsets[i] * Math.PI * 2;
      leg.rotation.x += (Math.sin(ph) * amp - leg.rotation.x) * k;
      const lo = lower.current[i];
      if (lo) {
        // fold the lower leg while it swings forward (hoof lifted)
        const lift = moving ? Math.max(0, Math.cos(ph)) * (gallop ? 1.25 : trot ? 1.0 : 0.7) : 0;
        const fold = i < 2 ? lift : -lift * 0.55; // knees bend back, hocks forward
        lo.rotation.x += (fold - lo.rotation.x) * k;
      }
    });
    if (body.current) {
      const bounce = gallop ? 0.08 : trot ? 0.05 : 0.02;
      body.current.position.y = moving ? Math.abs(Math.sin(s.phase)) * bounce - bounce * 0.5 : Math.sin(t * 1.1 + seed) * 0.006;
      body.current.rotation.x = gallop ? Math.sin(s.phase) * 0.045 : 0;
      body.current.rotation.z = moving && !gallop ? Math.sin(s.phase) * 0.012 : 0;
    }
    if (neck.current) {
      const idleBob = Math.sin(t * 0.8 + seed * 3) * 0.035;
      const nod = gallop ? Math.sin(s.phase) * 0.1 : moving ? Math.sin(s.phase * 2) * 0.05 : 0;
      neck.current.rotation.x = s.graze * 1.25 + idleBob + nod + (s.graze > 0.5 ? Math.sin(t * 3.2 + seed) * 0.035 : 0);
      neck.current.rotation.y += (a.look - neck.current.rotation.y) * Math.min(1, dt * 3);
    }
    // ears flick independently every few seconds
    s.earT -= dt;
    if (s.earT <= 0) {
      s.earT = 1.5 + Math.random() * 4;
      s.ear = 1;
    }
    s.ear = Math.max(0, s.ear - dt * 3);
    ears.current.forEach((e, i) => {
      if (e) e.rotation.z = (i ? -1 : 1) * (0.15 + Math.sin(s.ear * Math.PI) * 0.5 * (i === Math.floor(seed) % 2 ? 1 : 0.3));
    });
    s.swishT -= dt;
    if (s.swishT <= 0) {
      s.swishT = 2 + Math.random() * 4;
      s.swish = 1;
    }
    s.swish = Math.max(0, s.swish - dt * 1.1);
    // reins: from the bit to just in front of the saddle pommel (where the rider's hands are)
    if (reins.current && bitRef.current && root.current) {
      root.current.updateMatrixWorld();
      bitRef.current.getWorldPosition(tmp.a);
      root.current.worldToLocal(tmp.a);
      tmp.b.set(0, 1.5, 0.4);
      const len = tmp.a.distanceTo(tmp.b);
      reins.current.position.copy(tmp.a).add(tmp.b).multiplyScalar(0.5);
      reins.current.quaternion.setFromUnitVectors(tmp.up, tmp.b.sub(tmp.a).normalize());
      reins.current.scale.set(1, len, 1);
    }
    if (tail.current) {
      tail.current.rotation.z = Math.sin(t * 8) * 0.4 * s.swish + Math.sin(t * 1.3 + seed) * 0.04;
      tail.current.rotation.x += ((moving ? (gallop ? 0.75 : 0.15) : 0.05) - tail.current.rotation.x) * Math.min(1, dt * 4);
    }
  });

  // [x, z, front?]
  const legPos: [number, number, boolean][] = [
    [0.15, 0.52, true],
    [-0.15, 0.52, true],
    [0.15, -0.5, false],
    [-0.15, -0.5, false],
  ];

  return (
    <group ref={root} position={position} rotation-y={rotation} rotation-order="YXZ">
      <group ref={body}>
        <mesh geometry={geo.body} material={coatMat} castShadow receiveShadow />
        {/* neck + head (one surface), pivot at the withers */}
        <group ref={neck} position={[0, 1.2, 0.58]}>
          <mesh geometry={geo.neck} material={coatMat} castShadow receiveShadow />
          {MANE.map((l, i) => (
            <mesh key={i} position={l.p} rotation={l.r} material={maneMat} castShadow={i % 3 === 0}>
              <boxGeometry args={[0.022, l.len, 0.05]} />
            </mesh>
          ))}
          {/* forelock */}
          <mesh position={[0, 0.6, 0.53]} rotation-x={1.2} material={maneMat}>
            <boxGeometry args={[0.07, 0.15, 0.025]} />
          </mesh>
          {/* ears */}
          {[1, -1].map((sd, i) => (
            <mesh
              key={sd}
              ref={(el) => {
                ears.current[i] = el;
              }}
              position={[sd * 0.06, 0.63, 0.47]}
              rotation={[-0.25, 0, sd * 0.15]}
              geometry={earGeo}
              material={earMat}
            />
          ))}
          {/* eyes */}
          {[1, -1].map((sd) => (
            <mesh key={sd} position={[sd * 0.095, 0.5, 0.58]} scale={[0.5, 0.75, 1]} material={eyeMat}>
              <sphereGeometry args={[0.024, 10, 8]} />
            </mesh>
          ))}
          {/* nostrils */}
          {[1, -1].map((sd) => (
            <mesh key={sd} position={[sd * 0.035, 0.23, 0.88]} scale={[0.6, 1, 0.5]} material={eyeMat}>
              <sphereGeometry args={[0.016, 8, 6]} />
            </mesh>
          ))}
          {saddled && (
            // хазаар: leather bridle with silver fittings; reins attach at the bit rings
            <group>
              <mesh position={[0, 0.33, 0.75]} rotation-x={0.85} scale={[1, 0.82, 1]} material={leatherMat}>
                <torusGeometry args={[0.083, 0.011, 5, 20]} />
              </mesh>
              <mesh position={[0, 0.55, 0.52]} rotation-x={0.3} scale={[1, 0.9, 1]} material={leatherMat}>
                <torusGeometry args={[0.112, 0.011, 5, 20]} />
              </mesh>
              {[1, -1].map((sd) => (
                <group key={sd}>
                  <mesh position={[sd * 0.1, 0.45, 0.62]} rotation-x={0.95} material={leatherMat}>
                    <boxGeometry args={[0.012, 0.3, 0.022]} />
                  </mesh>
                  <mesh position={[sd * 0.078, 0.27, 0.8]} rotation-y={Math.PI / 2} material={silverMat}>
                    <torusGeometry args={[0.022, 0.006, 4, 12]} />
                  </mesh>
                  <mesh position={[sd * 0.112, 0.53, 0.53]} material={silverMat}>
                    <sphereGeometry args={[0.015, 8, 6]} />
                  </mesh>
                </group>
              ))}
              <object3D ref={bitRef} position={[0, 0.27, 0.8]} />
            </group>
          )}
        </group>
        {/* tail: long and full, nearly to the ground */}
        <group ref={tail} position={[0, 1.13, -0.8]}>
          <mesh position={[0, -0.05, -0.04]} rotation-x={-0.7} material={maneMat}>
            <cylinderGeometry args={[0.045, 0.055, 0.16, 8]} />
          </mesh>
          <mesh position={[0, -0.47, -0.1]} rotation-x={0.08} material={maneMat} castShadow>
            <coneGeometry args={[0.12, 0.85, 12, 1, true]} />
          </mesh>
          <mesh position={[0, -0.44, -0.1]} rotation-x={Math.PI + 0.08} material={maneMat}>
            <coneGeometry args={[0.055, 0.9, 8]} />
          </mesh>
          {[-0.08, -0.03, 0.03, 0.08].map((x, i) => (
            <mesh key={x} position={[x, -0.52 - (i % 2) * 0.05, -0.1]} rotation={[0.1, 0, x * 0.9]} material={maneMat}>
              <boxGeometry args={[0.018, 0.85, 0.028]} />
            </mesh>
          ))}
        </group>
        {saddled && (
          <group position={[0, 1.33, 0.08]}>
            {/* felt saddle cloth (тохом) with a woven border */}
            <mesh position={[0, -0.02, 0]}>
              <boxGeometry args={[0.76, 0.035, 0.74]} />
              <meshStandardMaterial color="#24497e" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.018, 0]}>
              <boxGeometry args={[0.8, 0.03, 0.78]} />
              <meshStandardMaterial color="#b8461c" roughness={0.9} />
            </mesh>
            {/* padded seat */}
            <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2} scale={[1, 1, 0.45]}>
              <capsuleGeometry args={[0.17, 0.2, 4, 12]} />
              <meshStandardMaterial color="#6e2414" roughness={0.6} />
            </mesh>
            {/* бүүргэ: tall arched wooden pommel (front) and cantle (back) with silver */}
            {[
              [0.23, -0.18, 0.2],
              [-0.23, 0.2, 0.16],
            ].map(([z, tilt, h], i) => (
              <group key={i} position={[0, 0.06, z]} rotation-x={tilt}>
                <mesh scale={[1, h / 0.16, 1]}>
                  <torusGeometry args={[0.16, 0.03, 6, 16, Math.PI]} />
                  <meshStandardMaterial color="#b4461c" roughness={0.45} />
                </mesh>
                <mesh scale={[1, h / 0.16, 1]} position-z={0.012}>
                  <torusGeometry args={[0.16, 0.012, 4, 16, Math.PI]} />
                  <meshStandardMaterial color="#d7d9dc" metalness={0.85} roughness={0.25} />
                </mesh>
                <mesh position={[0, h + 0.005, 0.02]}>
                  <sphereGeometry args={[0.028, 10, 8]} />
                  <meshStandardMaterial color="#d7d9dc" metalness={0.85} roughness={0.25} />
                </mesh>
              </group>
            ))}
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.31, -0.24, 0]} material={leatherMat}>
                  <boxGeometry args={[0.014, 0.42, 0.03]} />
                </mesh>
                <mesh position={[sd * 0.31, -0.47, 0]} rotation-y={Math.PI / 2} material={silverMat}>
                  <torusGeometry args={[0.05, 0.012, 4, 12, Math.PI]} />
                </mesh>
              </group>
            ))}
            {/* girth strap */}
            <mesh position={[0, -0.34, 0.12]} rotation-x={Math.PI / 2} material={leatherMat}>
              <torusGeometry args={[0.37, 0.018, 4, 24, Math.PI]} />
            </mesh>
          </group>
        )}
      </group>
      {saddled && (
        <mesh ref={reins} material={leatherMat}>
          <cylinderGeometry args={[0.008, 0.008, 1, 4]} />
        </mesh>
      )}
      {/* legs: one lofted upper (forearm/gaskin) + lower (cannon, fetlock, pastern) + hoof */}
      {legPos.map(([x, z, front], i) => {
        const lg = geo.legs[front ? 0 : 1];
        return (
          <group key={i} ref={(el) => { legs.current[i] = el; }} position={[x, 0.93, z]}>
            <mesh geometry={lg.upper} material={coatMat} castShadow />
            <group ref={(el) => { lower.current[i] = el; }} position-y={-0.42}>
              <mesh geometry={lg.lower} material={coatMat} castShadow />
              <mesh position={[0, -0.47, 0.035]} geometry={hoofGeo} material={hoofMat} castShadow />
            </group>
          </group>
        );
      })}
    </group>
  );
});
