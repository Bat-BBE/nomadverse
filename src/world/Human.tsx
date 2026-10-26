'use client';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { headGeometry } from '@/game/geo';

// A jointed herder in a deel: hips → legs (knee, ankle), spine → arms (elbow,
// wrist), neck → head with a simple face. Built at real proportions (~1.72 m),
// facing +z, feet at y = 0. Everything animates procedurally: walk/run cycle,
// idle breathing and glances, blinking, and a riding pose.

export interface HumanAnim {
  speed: number; // m/s
  riding: boolean;
  gallop: number; // 0..1 bounce while riding
}

export interface HumanHandle {
  anim: HumanAnim;
}

export interface HumanLook {
  deel?: string;
  trim?: string;
  sash?: string;
  skin?: string;
  woman?: boolean;
  hat?: boolean;
  seed?: number;
}

const HIP_Y = 0.92;

/** Radial fabric folds on a lathe between two heights (stronger toward y1). */
function folds(g: THREE.BufferGeometry, y0: number, y1: number, count: number, depth: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    if (t <= 0) continue;
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * count + Math.sin(a * 3) * 1.5) * depth * t * t;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
}

let brocade: THREE.CanvasTexture | null = null;
/** Light grey brocade (cloud-scroll / ulzii motifs) multiplied with the deel colour, also used as bump. */
function brocadeTexture() {
  if (brocade) return brocade;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#e4e4e4';
  c.fillRect(0, 0, 256, 256);
  // fine weave
  for (let y = 0; y < 256; y += 2) {
    c.fillStyle = y % 4 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.06)';
    c.fillRect(0, y, 256, 1);
  }
  // scattered round medallions with a four-lobed knot inside
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = 3;
  for (const [x, y] of [[64, 64], [192, 64], [0, 192], [128, 192], [256, 192]]) {
    c.beginPath();
    c.arc(x, y, 30, 0, Math.PI * 2);
    c.stroke();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      c.beginPath();
      c.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 9, 0, Math.PI * 2);
      c.stroke();
    }
  }
  // cloud scrolls between medallions
  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.lineWidth = 2;
  for (const [x, y] of [[128, 64], [64, 192], [192, 192], [0, 64], [256, 64]]) {
    for (const s of [1, -1]) {
      c.beginPath();
      c.arc(x + s * 10, y, 10, 0, Math.PI * 1.5, s < 0);
      c.stroke();
    }
  }
  brocade = new THREE.CanvasTexture(cv);
  brocade.wrapS = brocade.wrapT = THREE.RepeatWrapping;
  brocade.repeat.set(5, 3);
  brocade.colorSpace = THREE.SRGBColorSpace;
  brocade.anisotropy = 4;
  return brocade;
}

function lathe(points: [number, number][], seg = 24) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    seg
  );
}

function tube(points: [number, number, number][], r: number) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 24, r, 5);
}

export const Human = forwardRef<HumanHandle, HumanLook>(function Human(
  { deel = '#2a5a96', trim = '#d9a641', sash = '#e39b2f', skin = '#b98463', woman = false, hat = true, seed = 0 },
  ref
) {
  const anim = useRef<HumanAnim>({ speed: 0, riding: false, gallop: 0 });
  useImperativeHandle(ref, () => ({ anim: anim.current }), []);

  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const skirt = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lids = useRef<THREE.Group>(null);
  const thigh = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const knee = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arm = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const elbow = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const st = useRef({ phase: seed, blink: 2 + seed, look: 0, lookT: 3 + seed, lookTo: 0 });

  // ---- materials
  const m = useMemo(() => {
    const tex = brocadeTexture();
    const deelM = new THREE.MeshStandardMaterial({ color: deel, roughness: 0.68, map: tex, bumpMap: tex, bumpScale: 0.6 });
    return {
      deel: deelM,
      deelDark: new THREE.MeshStandardMaterial({ color: new THREE.Color(deel).multiplyScalar(0.6), roughness: 0.85 }),
      trim: new THREE.MeshStandardMaterial({ color: trim, roughness: 0.4, metalness: 0.35 }),
      sash: new THREE.MeshLambertMaterial({ color: sash }),
      skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62 }),
      face: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.58, vertexColors: true }),
      lip: new THREE.MeshStandardMaterial({ color: new THREE.Color(skin).lerp(new THREE.Color('#8a3a30'), 0.55), roughness: 0.5 }),
      hair: new THREE.MeshStandardMaterial({ color: '#15100c', roughness: 0.55 }),
      eyeW: new THREE.MeshStandardMaterial({ color: '#efe9df', roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: '#1d120a', roughness: 0.15 }),
      boot: new THREE.MeshStandardMaterial({ color: woman ? '#7a2a1c' : '#5a1f14', roughness: 0.45 }),
      sole: new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.8 }),
      trousers: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.9 }),
      silver: new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.25, metalness: 0.9 }),
      leather: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.7 }),
      hatRed: new THREE.MeshStandardMaterial({ color: '#9e2a1c', roughness: 0.75 }),
      fur: new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 1 }),
      scarf: new THREE.MeshStandardMaterial({ color: '#d9b45a', roughness: 0.7 }),
    };
  }, [deel, trim, sash, skin, woman]);

  // ---- geometry
  const g = useMemo(() => {
    const upper = lathe([
      [0.0, 0.56],
      [0.065, 0.56],
      [0.075, 0.5],
      [0.16, 0.47],
      [0.195, 0.42],
      [0.2, 0.32],
      [0.19, 0.2],
      [0.175, 0.08],
      [0.18, 0.0],
      [0.0, 0.0],
    ].reverse() as [number, number][]);
    const lower = lathe([
      [0.0, 0.02],
      [0.185, 0.02],
      [0.2, -0.12],
      [0.235, -0.35],
      [0.27, -0.6],
      [0.3, -0.76],
      [0.305, -0.78],
      [0.0, -0.78],
    ].reverse() as [number, number][]);
    // энгэр: the deel's curved overlap from the collar to the right armpit, then down the side
    const lapel = tube(
      [
        [-0.02, 0.53, 0.07],
        [0.06, 0.47, 0.15],
        [0.13, 0.4, 0.165],
        [0.18, 0.32, 0.12],
        [0.19, 0.18, 0.08],
        [0.2, 0.0, 0.08],
        [0.25, -0.35, 0.1],
        [0.29, -0.76, 0.12],
      ],
      0.012
    );
    const sleeve = lathe([
      [0.0, 0.02],
      [0.06, 0.02],
      [0.063, -0.12],
      [0.062, -0.26],
      [0.0, -0.26],
    ].reverse() as [number, number][], 12);
    const forearm = lathe([
      [0.0, 0.0],
      [0.058, 0.0],
      [0.064, -0.12],
      [0.072, -0.23],
      [0.0, -0.23],
    ].reverse() as [number, number][], 12);
    const cuff = lathe([
      [0.07, 0.0],
      [0.085, -0.03],
      [0.09, -0.06],
      [0.0, -0.06],
    ].reverse() as [number, number][], 12);
    const boot = new THREE.CylinderGeometry(0.062, 0.066, 0.3, 10);
    // soft vertical folds in the skirt, deepening toward the hem
    folds(lower, 0.02, -0.78, 14, 0.035);
    folds(upper, 0.0, 0.3, 9, 0.008);
    const head = headGeometry();
    const hp = head.attributes.position as THREE.BufferAttribute;
    const hc = new Float32Array(hp.count * 3);
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i);
      const y = hp.getY(i);
      const z = hp.getZ(i);
      // ruddy cheeks (salkhind ulaisan khatsar) and slightly darker lips area
      let blush = 0;
      for (const sx of [0.052, -0.052]) blush += Math.exp(-(((x - sx) ** 2) / 0.0006 + ((y + 0.012) ** 2) / 0.0005)) * (z > 0.03 ? 1 : 0);
      const c = new THREE.Color(1, 1, 1).lerp(new THREE.Color(1, 0.72, 0.66), Math.min(1, blush) * 0.6);
      hc.set([c.r, c.g, c.b], i * 3);
    }
    head.setAttribute('color', new THREE.BufferAttribute(hc, 3));
    return { upper, lower, lapel, sleeve, forearm, cuff, boot, head };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = anim.current;
    const s = st.current;
    const t = clock.elapsedTime + seed * 10;
    const k = Math.min(1, dt * 12);
    const lerpX = (o: THREE.Object3D | null, x: number, z = 0, y = 0) => {
      if (!o) return;
      o.rotation.x += (x - o.rotation.x) * k;
      o.rotation.z += (z - o.rotation.z) * k;
      o.rotation.y += (y - o.rotation.y) * k;
    };
    const sp = a.speed;
    const run = sp > 5;
    s.phase += dt * (run ? 9.5 : 1.6 + sp * 1.55);
    const sw = a.riding ? 0 : Math.min(1, sp / 2.5);
    const ph = s.phase;

    if (a.riding) {
      const b = Math.sin(t * 15) * 0.05 * a.gallop;
      for (const i of [0, 1]) {
        const side = i === 0 ? 1 : -1;
        lerpX(thigh[i].current, -1.35, side * 0.42);
        lerpX(knee[i].current, 1.45);
        lerpX(arm[i].current, -0.55, side * 0.12);
        lerpX(elbow[i].current, -0.9);
      }
      if (hips.current) hips.current.position.y = HIP_Y + b;
      lerpX(spine.current, 0.12 + a.gallop * 0.12 + b);
      lerpX(skirt.current, -0.6);
    } else {
      for (const i of [0, 1]) {
        const p = ph + i * Math.PI;
        const side = i === 0 ? 1 : -1;
        // thigh swings, knee folds during the forward swing, arm counter-swings
        lerpX(thigh[i].current, -Math.sin(p) * (run ? 0.75 : 0.45) * sw, side * 0.02);
        lerpX(knee[i].current, (Math.max(0, Math.cos(p)) * (run ? 1.4 : 0.75) + 0.05) * sw);
        lerpX(arm[i].current, Math.sin(p) * (run ? 0.7 : 0.38) * sw, side * (0.09 + (1 - sw) * 0.02));
        lerpX(elbow[i].current, -(0.18 + (run ? 0.9 : 0.25) * sw + Math.max(0, -Math.sin(p)) * 0.25 * sw));
      }
      const bob = Math.abs(Math.cos(ph)) * (run ? 0.06 : 0.028) * sw;
      const breathe = Math.sin(t * 1.7) * 0.004;
      if (hips.current) {
        hips.current.position.y = HIP_Y - 0.015 * sw + bob;
        hips.current.rotation.y = Math.sin(ph) * 0.08 * sw;
        hips.current.rotation.z = Math.sin(ph) * 0.03 * sw;
      }
      if (spine.current) {
        lerpX(spine.current, (run ? 0.18 : 0.04) * sw, 0, -Math.sin(ph) * 0.12 * sw);
        spine.current.scale.set(1 + breathe, 1 + breathe * 0.5, 1 + breathe * 1.5);
      }
      // the hem sways a little with the stride
      lerpX(skirt.current, Math.sin(ph * 2) * 0.03 * sw - (run ? 0.12 : 0.04) * sw, Math.sin(ph) * 0.03 * sw);
    }

    // glance around now and then when standing
    s.lookT -= dt;
    if (s.lookT <= 0) {
      s.lookT = 2.5 + Math.random() * 4;
      s.lookTo = sp > 0.5 ? 0 : (Math.random() - 0.5) * 1.1;
    }
    s.look += (s.lookTo - s.look) * Math.min(1, dt * 2.5);
    if (head.current) {
      head.current.rotation.y = s.look;
      head.current.rotation.x = Math.sin(t * 0.6) * 0.03 + (a.riding ? -0.1 : 0);
    }
    // blink
    s.blink -= dt;
    if (s.blink <= 0) s.blink = 2.5 + Math.random() * 3.5;
    if (lids.current) lids.current.scale.y = s.blink < 0.12 ? 1 : 0.001;
  });

  const legs = [0.1, -0.1];
  const arms = [0.205, -0.205];

  return (
    <group>
      <group ref={hips} position-y={HIP_Y}>
        {/* legs: trousers + гутал boots with upturned toes */}
        {legs.map((x, i) => (
          <group key={i} ref={thigh[i]} position={[x, -0.02, 0]}>
            <mesh position-y={-0.2} material={m.trousers} castShadow>
              <capsuleGeometry args={[0.07, 0.3, 4, 10]} />
            </mesh>
            <group ref={knee[i]} position-y={-0.43}>
              <mesh position-y={-0.12} material={m.trousers}>
                <capsuleGeometry args={[0.058, 0.16, 4, 8]} />
              </mesh>
              <mesh position-y={-0.27} geometry={g.boot} material={m.boot} castShadow />
              <mesh position-y={-0.13} material={m.trim}>
                <torusGeometry args={[0.064, 0.009, 4, 14]} />
              </mesh>
              <group position-y={-0.43}>
                <mesh position={[0, 0.03, 0.04]} scale={[0.065, 0.045, 0.13]} material={m.boot} castShadow>
                  <sphereGeometry args={[1, 12, 8]} />
                </mesh>
                <mesh position={[0, 0.06, 0.17]} rotation-x={-1.1} material={m.boot}>
                  <coneGeometry args={[0.022, 0.08, 8]} />
                </mesh>
                <mesh position={[0, -0.005, 0.04]} scale={[0.07, 0.014, 0.14]} material={m.sole}>
                  <sphereGeometry args={[1, 10, 6]} />
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* deel skirt hangs from the waist */}
        <group ref={skirt}>
          <mesh geometry={g.lower} material={m.deel} castShadow />
          <mesh position-y={-0.765} rotation-x={Math.PI / 2} material={m.trim}>
            <torusGeometry args={[0.302, 0.013, 4, 32]} />
          </mesh>
        </group>

        <group ref={spine}>
          <mesh geometry={g.upper} material={m.deel} castShadow />
          <mesh geometry={g.lapel} material={m.trim} />
          {/* knot buttons (товч) along the lapel */}
          {[
            [0.065, 0.47, 0.152],
            [0.17, 0.35, 0.14],
            [0.19, 0.2, 0.09],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} material={m.trim}>
              <sphereGeometry args={[0.012, 8, 6]} />
            </mesh>
          ))}
          {/* stand-up collar */}
          <mesh position-y={0.555} material={m.trim}>
            <cylinderGeometry args={[0.068, 0.078, 0.06, 16, 1, true]} />
          </mesh>
          {/* бүс: wide wrapped sash with folds and hanging tails */}
          <mesh position-y={0.02} material={m.sash} castShadow>
            <cylinderGeometry args={[0.192, 0.19, 0.12, 24]} />
          </mesh>
          {[-0.035, 0.0, 0.035].map((y) => (
            <mesh key={y} position-y={0.02 + y} rotation-x={Math.PI / 2} material={m.sash}>
              <torusGeometry args={[0.193, 0.006, 4, 24]} />
            </mesh>
          ))}
          <mesh position={[-0.11, -0.09, 0.15]} rotation={[0.12, 0.3, 0.12]} material={m.sash}>
            <boxGeometry args={[0.055, 0.22, 0.015]} />
          </mesh>
          <mesh position={[-0.155, -0.1, 0.12]} rotation={[0.1, 0.6, 0.2]} material={m.sash}>
            <boxGeometry args={[0.045, 0.2, 0.015]} />
          </mesh>
          {!woman && (
            // хэт хутга: knife sheath, chopsticks and flint pouch on a silver chain
            <group position={[0.17, -0.02, 0.07]} rotation-z={0.15}>
              <mesh position-y={-0.08} material={m.silver}>
                <cylinderGeometry args={[0.004, 0.004, 0.14, 4]} />
              </mesh>
              <mesh position={[0.0, -0.21, 0.01]} rotation-z={0.1} material={m.leather}>
                <boxGeometry args={[0.035, 0.2, 0.025]} />
              </mesh>
              <mesh position={[0.0, -0.16, 0.025]} material={m.silver}>
                <boxGeometry args={[0.038, 0.03, 0.006]} />
              </mesh>
              <mesh position={[0.05, -0.17, 0.0]} material={m.leather}>
                <boxGeometry args={[0.05, 0.06, 0.02]} />
              </mesh>
            </group>
          )}

          {/* arms with long sleeves and horse-hoof cuffs (тах ханцуй) */}
          {arms.map((x, i) => (
            <group key={i} ref={arm[i]} position={[x, 0.44, 0]}>
              <mesh position={[0, -0.01, 0]} scale={[0.06, 0.055, 0.065]} material={m.deel}>
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
              <mesh geometry={g.sleeve} material={m.deel} castShadow />
              <group ref={elbow[i]} position-y={-0.26}>
                <mesh geometry={g.forearm} material={m.deel} castShadow />
                <mesh position-y={-0.21} geometry={g.cuff} material={m.trim} />
                {/* hand */}
                <group position-y={-0.3}>
                  <mesh scale={[0.034, 0.05, 0.022]} material={m.skin}>
                    <sphereGeometry args={[1, 10, 8]} />
                  </mesh>
                  <mesh position={[i === 0 ? -0.022 : 0.022, 0.0, 0.015]} rotation-z={i === 0 ? 0.5 : -0.5} material={m.skin}>
                    <capsuleGeometry args={[0.009, 0.025, 3, 6]} />
                  </mesh>
                </group>
              </group>
            </group>
          ))}

          {/* neck + head */}
          <mesh position-y={0.57} material={m.skin}>
            <cylinderGeometry args={[0.045, 0.055, 0.07, 10]} />
          </mesh>
          <group ref={head} position-y={0.6}>
            <group position-y={0.12} scale={1.12}>
              {/* one sculpted surface: cranium, jaw, cheekbones, brow, nose; blush baked in */}
              <mesh geometry={g.head} material={m.face} castShadow />
              {/* eyes, narrow with heavy upper lids */}
              {[1, -1].map((sd) => (
                <group key={sd} position={[sd * 0.036, 0.022, 0.088]}>
                  <mesh scale={[0.016, 0.0075, 0.008]} material={m.eyeW}>
                    <sphereGeometry args={[1, 10, 6]} />
                  </mesh>
                  <mesh position={[0, 0, 0.004]} scale={[0.0075, 0.0072, 0.006]} material={m.iris}>
                    <sphereGeometry args={[1, 8, 6]} />
                  </mesh>
                  <mesh position={[0, 0.008, 0.003]} rotation-z={sd * -0.08} material={m.hair}>
                    <boxGeometry args={[0.034, 0.0035, 0.006]} />
                  </mesh>
                  {/* eyebrow */}
                  <mesh position={[sd * 0.002, 0.024, 0.004]} rotation-z={sd * -0.12} material={m.hair}>
                    <boxGeometry args={[0.036, 0.006, 0.006]} />
                  </mesh>
                </group>
              ))}
              <group ref={lids}>
                {[1, -1].map((sd) => (
                  <mesh key={sd} position={[sd * 0.036, 0.022, 0.093]} scale={[0.017, 0.009, 0.005]} material={m.skin}>
                    <sphereGeometry args={[1, 8, 6]} />
                  </mesh>
                ))}
              </group>
              {/* mouth */}
              <mesh position={[0, -0.05, 0.09]} scale={[0.024, 0.006, 0.008]} material={m.lip}>
                <sphereGeometry args={[1, 10, 6]} />
              </mesh>
              {/* ears */}
              {[1, -1].map((sd) => (
                <mesh key={sd} position={[sd * 0.097, 0.005, -0.005]} scale={[0.014, 0.03, 0.022]} material={m.skin}>
                  <sphereGeometry args={[1, 8, 6]} />
                </mesh>
              ))}
              {/* hair */}
              <mesh position={[0, 0.02, -0.012]} scale={[0.103, 0.11, 0.105]} material={m.hair}>
                <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              </mesh>
              <mesh position={[0, -0.015, -0.035]} scale={[0.1, 0.1, 0.085]} material={m.hair}>
                <sphereGeometry args={[1, 16, 10]} />
              </mesh>

              {woman ? (
                <>
                  {/* braid, silver earrings and a tied headscarf (алчуур) */}
                  <mesh position={[0, -0.16, -0.085]} rotation-x={0.12} material={m.hair}>
                    <capsuleGeometry args={[0.02, 0.3, 4, 8]} />
                  </mesh>
                  {[1, -1].map((sd) => (
                    <mesh key={sd} position={[sd * 0.1, -0.035, 0.0]} material={m.silver}>
                      <sphereGeometry args={[0.009, 8, 6]} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.04, -0.022]} rotation-x={-0.35} scale={[0.108, 0.112, 0.112]} material={m.scarf}>
                    <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
                  </mesh>
                  <mesh position={[0, -0.02, -0.105]} rotation-x={0.6} material={m.scarf}>
                    <coneGeometry args={[0.04, 0.1, 8]} />
                  </mesh>
                </>
              ) : (
                hat && (
                  <group position-y={0.08}>
                    {/* малгай: fur-lined upturned brim, domed red crown, gold knot (жинс) and ribbons */}
                    <mesh position-y={-0.005} material={m.fur}>
                      <cylinderGeometry args={[0.135, 0.118, 0.06, 20]} />
                    </mesh>
                    <mesh position-y={0.02} scale={[0.112, 0.12, 0.112]} material={m.hatRed}>
                      <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    </mesh>
                    {[0.04, 0.075].map((y) => (
                      <mesh key={y} position-y={y} rotation-x={Math.PI / 2} material={m.trim}>
                        <torusGeometry args={[0.112 - (y - 0.02) * 0.6, 0.004, 4, 20]} />
                      </mesh>
                    ))}
                    <mesh position-y={0.148} material={m.trim}>
                      <sphereGeometry args={[0.022, 10, 8]} />
                    </mesh>
                    {[1, -1].map((sd) => (
                      <mesh key={sd} position={[sd * 0.025, -0.06, -0.12]} rotation={[0.25, 0, sd * 0.08]} material={m.hatRed}>
                        <boxGeometry args={[0.022, 0.16, 0.004]} />
                      </mesh>
                    ))}
                  </group>
                )
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
