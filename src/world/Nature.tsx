'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fbm, heightAt, LOC, riverDistance, riverZ, WATER_Y, WORLD_SIZE } from '@/game/terrain';
import { world } from '@/game/store';
import { addStatic } from '@/game/colliders';
import { env } from '@/game/tod';
import { cloudPuff } from './Ger';
import { stoneTexture } from '@/game/textures';

// ---------------------------------------------------------------- Grass
// Infinite grass: a fixed set of instanced tufts tiles a square around the
// player (each blade wraps to the copy of itself nearest the player). Ground
// height, density mask (river, ger floors, ovoo) and dryness come from a data
// texture sampled in the vertex shader at the terrain mesh's own vertex grid,
// so blades sit exactly on the rendered ground anywhere in the valley.

const GRASS_R = 56; // half size of the tile around the player

const grassVert = /* glsl */ `
uniform float uTime;
uniform vec2 uCenter;
uniform sampler2D uGround;
uniform float uWorld;
uniform float uGrid;
attribute vec3 aOffset;
attribute vec2 aScaleRot; // height, rotation
attribute float aTint;
varying float vH;
varying float vTint;
varying float vFog;
varying vec3 vWP;
void main() {
  vH = position.y;
  // wrap this blade to the tile copy nearest the player
  float span = ${(GRASS_R * 2).toFixed(1)};
  vec2 o = aOffset.xz;
  o += floor((uCenter - o) / span + 0.5) * span;
  // sample ground: texel centres sit on the terrain mesh vertices
  vec2 uv = (o / uWorld + 0.5) * (uGrid - 1.0) / uGrid + 0.5 / uGrid;
  vec4 gnd = texture2D(uGround, uv);
  float edge = 1.0 - smoothstep(${(GRASS_R * 0.7).toFixed(1)}, ${(GRASS_R * 0.98).toFixed(1)}, length(o - uCenter));
  float h = aScaleRot.x * gnd.g * edge;
  vTint = clamp(aTint + gnd.b, 0.0, 1.0);
  float s = sin(aScaleRot.y), c = cos(aScaleRot.y);
  vec3 p = position;
  p.y *= h;
  p.xz *= 0.6 + 0.4 * min(1.0, h * 4.0);
  p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  vec3 wp = p + vec3(o.x, gnd.r - 0.02, o.y);
  // wind: big rolling gusts + small flutter, stronger at the tip
  float gust = sin(o.x * 0.08 + o.y * 0.05 + uTime * 1.3) * 0.5 + 0.5;
  float flutter = sin(uTime * 4.0 + o.x * 1.7 + o.y * 1.3);
  float bend = vH * vH * h * (0.35 + 0.55 * gust + 0.1 * flutter);
  wp.x += bend * 0.8;
  wp.z += bend * 0.35;
  vWP = wp;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const grassFrag = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uTip;
uniform vec3 uDry;
uniform vec3 uLight;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform float uGlow;
varying float vH;
varying float vTint;
varying float vFog;
varying vec3 vWP;
void main() {
  vec3 tip = mix(uTip, uDry, vTint);
  vec3 col = mix(uBase, tip, smoothstep(0.0, 0.9, vH));
  col *= 0.85 + vTint * 0.1;
  col *= uLight;
  // sunlight shining through the blades when looking toward the sun
  vec3 V = normalize(vWP - cameraPosition);
  float back = pow(max(dot(V, normalize(uSunDir)), 0.0), 3.0) * vH * vH;
  col += uSunCol * back * 0.2 * uGlow * (0.6 + vTint * 0.4);
  float f = smoothstep(uFogNear, uFogFar, vFog);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const GRID = 221; // matches the terrain mesh (220 segments)
let groundTex: THREE.DataTexture | null = null;
/** RGBA half-float: R ground height, G grass density/height factor, B dryness. */
function groundTexture() {
  if (groundTex) return groundTex;
  const data = new Uint16Array(GRID * GRID * 4);
  const toH = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const x = -WORLD_SIZE / 2 + (i / (GRID - 1)) * WORLD_SIZE;
      const z = -WORLD_SIZE / 2 + (j / (GRID - 1)) * WORLD_SIZE;
      const r = Math.hypot(x, z);
      let dens = 1;
      if (riverDistance(x, z) < 5.4) dens = 0;
      if (r < 5.5) dens = 0; // ger floor
      if (Math.hypot(x - 96, z - 8) < 4.5 || Math.hypot(x + 52, z - 62) < 4.5) dens = 0; // neighbours
      if (Math.hypot(x - LOC.ovoo.x, z - LOC.ovoo.z) < 2.6) dens = 0;
      if (r < 11) dens *= 0.55; // trampled around the camp
      const lush = riverDistance(x, z) < 14 ? 1.3 : 1;
      const patch = 0.5 + fbm(x * 0.06, z * 0.06, 2);
      const dry = Math.min(1, Math.max(0, fbm(x * 0.008 - 20, z * 0.008 + 5, 3) * 1.4 - 0.4));
      const k = (j * GRID + i) * 4;
      data[k] = toH(heightAt(x, z));
      data[k + 1] = toH(dens * lush * patch);
      data[k + 2] = toH(dry);
      data[k + 3] = toH(1);
    }
  }
  groundTex = new THREE.DataTexture(data, GRID, GRID, THREE.RGBAFormat, THREE.HalfFloatType);
  groundTex.magFilter = THREE.LinearFilter;
  groundTex.minFilter = THREE.LinearFilter;
  groundTex.wrapS = groundTex.wrapT = THREE.ClampToEdgeWrapping;
  groundTex.needsUpdate = true;
  return groundTex;
}

export function Grass({ count = 140000 }: { count?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: grassVert,
        fragmentShader: grassFrag,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector2() },
          uGround: { value: groundTexture() },
          uWorld: { value: WORLD_SIZE },
          uGrid: { value: GRID },
          uBase: { value: new THREE.Color('#3c4c24') },
          uTip: { value: new THREE.Color('#7f9a48') },
          uDry: { value: new THREE.Color('#a89c62') },
          uLight: { value: new THREE.Color(1, 1, 1) },
          uFogColor: { value: env.fog },
          uFogNear: { value: 90 },
          uFogFar: { value: 1000 },
          uSunCol: { value: env.sun },
          uSunDir: { value: env.sunDir },
          uGlow: { value: 1 },
        },
      }),
    []
  );

  const geo = useMemo(() => {
    // blade: 7 verts, 5 tris, slightly curved
    const blade = new THREE.BufferGeometry();
    const w = 0.028;
    blade.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-w, 0, 0, w, 0, 0, -w * 0.85, 0.35, 0.02, w * 0.85, 0.35, 0.02, -w * 0.5, 0.7, 0.06, w * 0.5, 0.7, 0.06, 0, 1, 0.14],
        3
      )
    );
    blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
    const g = new THREE.InstancedBufferGeometry();
    g.index = blade.index;
    g.attributes.position = blade.attributes.position;
    const off = new Float32Array(count * 3);
    const sr = new Float32Array(count * 2);
    const tint = new Float32Array(count);
    let n = 0;
    // steppe grass grows in short tufts with bare ground between them
    while (n < count) {
      const cx = (Math.random() * 2 - 1) * GRASS_R;
      const cz = (Math.random() * 2 - 1) * GRASS_R;
      const patch = fbm(cx * 0.06 + 3, cz * 0.06, 2);
      const tuftH = 0.14 + patch * 0.32;
      const blades = 5 + Math.floor(Math.random() * 9);
      for (let k = 0; k < blades && n < count; k++) {
        off.set([cx + (Math.random() - 0.5) * 0.28, 0, cz + (Math.random() - 0.5) * 0.28], n * 3);
        sr.set([tuftH * (0.55 + Math.random() * 0.7), Math.random() * Math.PI * 2], n * 2);
        tint[n] = (Math.random() - 0.5) * 0.35;
        n++;
      }
    }
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
    g.setAttribute('aScaleRot', new THREE.InstancedBufferAttribute(sr, 2));
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
    g.instanceCount = n;
    return g;
  }, [count]);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    (mat.uniforms.uCenter.value as THREE.Vector2).set(world.player.x, world.player.z);
    mat.uniforms.uGlow.value = Math.min(1.4, env.glow);
    // approximate lighting from the shared environment
    const k = 0.45 + env.sunIntensity * 0.22;
    (mat.uniforms.uLight.value as THREE.Color).copy(env.sun).multiplyScalar(k).lerp(env.hemiSky, 0.25);
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

// ---------------------------------------------------------------- River

const waterVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying float vFog;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const waterFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
varying vec2 vUv;
varying vec3 vWorld;
varying float vFog;
void main() {
  float edge = abs(vUv.y - 0.5) * 2.0;
  vec3 col = mix(uDeep, uShallow, smoothstep(0.3, 1.0, edge));
  // flowing streaks along the river
  float s1 = sin(vUv.x * 220.0 - uTime * 2.2 + sin(vUv.y * 9.0 + uTime) * 1.5);
  float s2 = sin(vUv.x * 140.0 - uTime * 1.6 + vUv.y * 20.0);
  float streak = smoothstep(0.75, 1.0, s1 * 0.6 + s2 * 0.4);
  // rippled surface normal from a few travelling waves (flow is along +x)
  vec2 p = vWorld.xz;
  float t = uTime;
  vec2 g = vec2(0.0);
  g += vec2(cos(p.x * 1.7 - t * 2.1 + p.y * 0.6), sin(p.y * 2.3 + t * 0.9)) * 0.05;
  g += vec2(cos(p.x * 4.1 - t * 3.3 - p.y * 1.7), cos(p.y * 3.7 - t * 1.4 + p.x)) * 0.025;
  g += vec2(sin(p.x * 9.3 - t * 4.5 + p.y * 3.1), sin(p.y * 8.7 + t * 2.2 - p.x * 2.0)) * 0.012;
  vec3 N = normalize(vec3(g.x, 1.0, g.y));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, uSky * 0.6, 0.08 + fres * 0.42);
  vec3 R = reflect(-V, N);
  float sd = max(dot(R, normalize(uSunDir)), 0.0);
  float spec = pow(sd, 90.0) * 2.2 + pow(sd, 12.0) * 0.12;
  // glitter: tiny bright sparkles on wave crests along the sun path
  float glit = step(0.985, fract(sin(dot(floor(p * 9.0 + t * 1.5), vec2(12.9898, 78.233))) * 43758.5453)) * pow(sd, 6.0);
  col += uSun * (spec + glit * 1.5 + streak * 0.08);
  col = mix(col, vec3(0.9, 0.85, 0.75), smoothstep(0.85, 1.0, edge) * 0.35); // foam at banks
  col = mix(col, uFogColor, smoothstep(90.0, 1000.0, vFog));
  gl_FragColor = vec4(col, 0.92);
  #include <colorspace_fragment>
}`;

export function River() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waterVert,
        fragmentShader: waterFrag,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color('#2f4f52') },
          uShallow: { value: new THREE.Color('#6f8a78') },
          uSky: { value: env.skyHorizon },
          uSun: { value: env.sun },
          uSunDir: { value: env.sunDir },
          uFogColor: { value: env.fog },
        },
      }),
    []
  );

  const geo = useMemo(() => {
    const seg = 400;
    const x0 = -320;
    const x1 = 320;
    const half = 7.5;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const x = x0 + (x1 - x0) * t;
      const z = riverZ(x);
      const dz = (riverZ(x + 0.5) - riverZ(x - 0.5)) / 1;
      const nx = -dz;
      const nz = 1;
      const l = Math.hypot(nx, nz);
      pos.push(x - (nx / l) * half, WATER_Y, z - (nz / l) * half);
      pos.push(x + (nx / l) * half, WATER_Y, z + (nz / l) * half);
      uv.push(t, 0, t, 1);
      if (i < seg) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return <mesh geometry={geo} material={mat} />;
}

// ---------------------------------------------------------------- Clouds

const WHITE = new THREE.Color(1, 1, 1);
const lit = new THREE.Color();
const shade = new THREE.Color();

// Soft cumulus built from layered sprites: bright tops, cooler grey bellies.
function Cloud({ seed, radius, height, speed, size }: { seed: number; radius: number; height: number; speed: number; size: number }) {
  const ref = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const rnd = (i: number) => {
      const s = Math.sin(seed * 91.7 + i * 12.9) * 43758.5;
      return s - Math.floor(s);
    };
    const n = 26 + Math.floor(rnd(0) * 14);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const x = (t - 0.5) * 60 * size + (rnd(i + 1) - 0.5) * 10;
      const bump = Math.sin(t * Math.PI); // taller in the middle
      const y = rnd(i + 20) * 14 * bump * size;
      const z = (rnd(i + 40) - 0.5) * 18 * size;
      const s = (9 + rnd(i + 60) * 11) * (0.6 + bump * 0.7) * size;
      out.push({ x, y, z, s, up: Math.min(1, y / (10 * size)), mat: new THREE.SpriteMaterial({ map: cloudPuff(), transparent: true, opacity: 0.88, depthWrite: false, fog: false }) });
    }
    // flat base
    for (let i = 0; i < 5; i++) {
      out.push({ x: (i - 2) * 11 * size, y: -3 * size, z: 0, s: 20 * size, up: -0.3, mat: new THREE.SpriteMaterial({ map: cloudPuff(), transparent: true, opacity: 0.6, depthWrite: false, fog: false }) });
    }
    return out;
  }, [seed, size]);

  useFrame(({ clock, camera }) => {
    if (!ref.current) return;
    const a = seed * 1.7 + clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(a) * radius, height, Math.sin(a) * radius);
    // light each puff from the sun: warm, bright rims toward the sun, violet-grey bellies
    const g = ref.current;
    lit.copy(env.sun).lerp(WHITE, 0.45).multiplyScalar(1.05 + env.glow * 0.1);
    shade.copy(env.skyTop).lerp(env.fog, 0.55).multiplyScalar(0.62 + env.dayness * 0.3);
    puffs.forEach((p) => {
      const wx = g.position.x + p.x - camera.position.x;
      const wz = g.position.z + p.z - camera.position.z;
      const l = Math.hypot(wx, wz) || 1;
      // clouds between the camera and the sun glow along their edges
      const toward = Math.max(0, (wx * env.sunDir.x + wz * env.sunDir.z) / l);
      const k = THREE.MathUtils.clamp(0.25 + p.up * 0.55 + toward * 0.45 * env.glow, 0, 1);
      p.mat.color.copy(shade).lerp(lit, k);
    });
  });

  return (
    <group ref={ref}>
      {puffs.map((p, i) => (
        <sprite key={i} material={p.mat} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.7, 1]} />
      ))}
    </group>
  );
}

export function Clouds() {
  const list = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        seed: i + 1,
        radius: 140 + ((i * 53) % 240),
        height: 75 + ((i * 17) % 45),
        speed: 0.003 + ((i * 7) % 5) * 0.0008,
        size: 0.7 + ((i * 31) % 10) / 15,
      })),
    []
  );
  return (
    <>
      {list.map((c) => (
        <Cloud key={c.seed} {...c} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Rocks & shrubs

export function Scatter() {
  const { rocks, shrubs } = useMemo(() => {
    const rocks: THREE.Matrix4[] = [];
    const shrubs: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // Rock outcrops (хад): clusters of weathered, flattened boulders on hilltops
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const outcrops: [number, number, number][] = [
      [LOC.ovoo.x + 14, LOC.ovoo.z - 10, 1.4],
      [LOC.ovoo.x - 16, LOC.ovoo.z + 8, 1.1],
      [LOC.ovoo.x + 4, LOC.ovoo.z + 18, 0.9],
      [-30, -72, 1.2],
      [82, -92, 1.6],
      [70, -70, 0.8],
      [-110, 20, 1.3],
      [120, 40, 1.0],
      [-60, 95, 0.9],
      [30, -120, 1.5],
    ];
    for (const [ox, oz, size] of outcrops) {
      const n = 6 + Math.floor(rnd() * 8);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        const r = rnd() * 4.5 * size;
        const x = ox + Math.cos(a) * r;
        const z = oz + Math.sin(a) * r;
        if (Math.hypot(x - LOC.ovoo.x, z - LOC.ovoo.z) < 9) continue;
        const s = (0.5 + rnd() * 1.6) * size * (1 - r / (6 * size));
        e.set(rnd() * 0.4, rnd() * 3, rnd() * 0.4);
        q.setFromEuler(e);
        m.compose(v.set(x, heightAt(x, z) + s * 0.2, z), q, sc.set(s * (1 + rnd()), s * 0.75, s));
        rocks.push(m.clone());
        if (s > 0.35) addStatic({ x, z, r: Math.max(sc.x, sc.z) * 0.85 });
      }
    }
    // a few lone stones in the grass
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 18 + rnd() * 140;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (riverDistance(x, z) < 7) continue;
      const s = 0.15 + rnd() * 0.3;
      e.set(rnd(), rnd() * 3, rnd());
      q.setFromEuler(e);
      m.compose(v.set(x, heightAt(x, z) + s * 0.1, z), q, sc.set(s, s * 0.6, s));
      rocks.push(m.clone());
    }
    // sparse low shrubs (харгана) on drier ground
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 25 + rnd() * 120;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (riverDistance(x, z) < 8) continue;
      const s = 0.25 + rnd() * 0.3;
      m.compose(v.set(x, heightAt(x, z) + s * 0.2, z), q.identity(), sc.set(s, s * 0.55, s));
      shrubs.push(m.clone());
    }
    return { rocks, shrubs };
  }, []);

  const rockRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    rocks.forEach((m, i) => rockRef.current?.setMatrixAt(i, m));
    shrubs.forEach((m, i) => shrubRef.current?.setMatrixAt(i, m));
    if (rockRef.current) rockRef.current.instanceMatrix.needsUpdate = true;
    if (shrubRef.current) shrubRef.current.instanceMatrix.needsUpdate = true;
  }, [rocks, shrubs]);

  return (
    <>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial map={stoneTexture()} bumpMap={stoneTexture()} bumpScale={1.5} roughness={0.92} flatShading />
      </instancedMesh>
      <instancedMesh ref={shrubRef} args={[undefined, undefined, shrubs.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshLambertMaterial color="#5a6138" flatShading />
      </instancedMesh>
    </>
  );
}

// ---------------------------------------------------------------- Wildflowers
// Clusters of small steppe flowers (purple, pink, yellow, white) on thin stems.

const FLOWER_COLORS = ['#8d5fd0', '#a86ad8', '#d47db4', '#e9c548', '#f3efe4', '#6c86d8', '#e98a5a'];

export function Flowers({ count = 7000 }: { count?: number }) {
  const heads = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const out: { x: number; y: number; z: number; h: number; c: number; s: number }[] = [];
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    while (out.length < count) {
      // cluster centres, denser around the camp and toward the opening shot
      const r = 38 + Math.pow(rnd(), 1.2) * 70; // keep the camp itself clear
      const a = rnd() * Math.PI * 2;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      if (riverDistance(cx, cz) < 6) continue;
      if (fbm(cx * 0.04 + 50, cz * 0.04, 2) < 0.52) continue; // meadows, not everywhere
      const c = Math.floor(rnd() * FLOWER_COLORS.length);
      const n = 5 + Math.floor(rnd() * 16);
      for (let i = 0; i < n && out.length < count; i++) {
        const ang = rnd() * Math.PI * 2;
        const rad = Math.pow(rnd(), 1.5) * 1.8;
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        out.push({ x, z, y: heightAt(x, z), h: 0.07 + rnd() * 0.18, c: rnd() < 0.85 ? c : Math.floor(rnd() * FLOWER_COLORS.length), s: 0.022 + rnd() * 0.02 });
      }
    }
    return out;
  }, [count]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    data.forEach((f, i) => {
      m.compose(v.set(f.x, f.y + f.h, f.z), q, sc.set(f.s, f.s * 0.7, f.s));
      heads.current?.setMatrixAt(i, m);
      heads.current?.setColorAt(i, col.set(FLOWER_COLORS[f.c]));
      m.compose(v.set(f.x, f.y + f.h / 2, f.z), q, sc.set(1, f.h, 1));
      stems.current?.setMatrixAt(i, m);
    });
    if (heads.current) {
      heads.current.instanceMatrix.needsUpdate = true;
      if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
    }
    if (stems.current) stems.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  return (
    <>
      <instancedMesh ref={heads} args={[undefined, undefined, data.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshLambertMaterial emissive="#2a1a30" emissiveIntensity={0.25} />
      </instancedMesh>
      <instancedMesh ref={stems} args={[undefined, undefined, data.length]} frustumCulled={false}>
        <boxGeometry args={[0.008, 1, 0.008]} />
        <meshLambertMaterial color="#4f6a2c" />
      </instancedMesh>
    </>
  );
}
