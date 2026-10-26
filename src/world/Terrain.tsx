'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, heightAt, riverDistance, smoothstep, WORLD_SIZE } from '@/game/terrain';

// Muted steppe palette: olive greens fading into straw and ochre
const GRASS = new THREE.Color('#71844a');
const GRASS_LUSH = new THREE.Color('#5a7438');
const DRY = new THREE.Color('#a99b66');
const EARTH = new THREE.Color('#8b7a58');
const ROCK = new THREE.Color('#8a857a');
const MUD = new THREE.Color('#6b6250');
const CAMP = new THREE.Color('#857d5a');

// Adds fine, world-space colour breakup (tufts, bare soil, dry patches) to the
// vertex-coloured terrain so it doesn't read as flat low-poly colour up close.
function detailMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWPos;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec2 p = vWPos.xz;
  float tuft = vn(p * 3.1) * 0.6 + vn(p * 9.7) * 0.4;
  float soil = smoothstep(0.62, 0.8, vn(p * 0.9 + 3.7) * 0.7 + vn(p * 4.3) * 0.3);
  float straw = smoothstep(0.45, 0.75, vn(p * 0.22 - 11.0));
  vec3 c = diffuseColor.rgb;
  c *= 0.82 + tuft * 0.3;
  c = mix(c, c * vec3(1.18, 1.08, 0.82), straw * 0.45);
  c = mix(c, vec3(0.42, 0.36, 0.27) * (0.8 + tuft * 0.4), soil * 0.35);
  diffuseColor.rgb = c;
}`
      );
  };
  return m;
}

export function Terrain() {
  const geo = useMemo(() => {
    const seg = 220;
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);

      // slope estimate
      const e = 1.5;
      const slope = Math.hypot(heightAt(x + e, z) - y, heightAt(x, z + e) - y) / e;

      const n = fbm(x * 0.02 + 7, z * 0.02 - 3, 3);
      c.copy(GRASS).lerp(GRASS_LUSH, smoothstep(0.45, 0.7, n));
      c.lerp(DRY, smoothstep(0.55, 0.8, fbm(x * 0.008 - 20, z * 0.008 + 5, 3)) * 0.8);
      c.lerp(EARTH, smoothstep(0.35, 0.7, slope) * 0.7);
      c.lerp(ROCK, smoothstep(0.7, 1.2, slope));
      c.lerp(DRY, smoothstep(10, 30, y) * 0.5);
      // trampled earth around the camp
      const r = Math.hypot(x, z);
      c.lerp(CAMP, smoothstep(9, 4, r) * 0.6);
      // banks
      const d = riverDistance(x, z);
      c.lerp(GRASS_LUSH, smoothstep(16, 9, d) * 0.6);
      c.lerp(MUD, smoothstep(7.5, 5, d));
      // small variation
      const v = 0.92 + Math.random() * 0.1;
      colors.set([c.r * v, c.g * v, c.b * v], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(detailMaterial, []);

  return (
    <>
      <mesh geometry={geo} material={mat} receiveShadow />
      {/* far ground under the mountain rings */}
      <mesh rotation-x={-Math.PI / 2} position-y={-3}>
        <circleGeometry args={[1400, 48]} />
        <meshLambertMaterial color="#7f8656" />
      </mesh>
    </>
  );
}

// Mountain rings: green foothills close by, a rocky middle range, and a high
// snow-capped range far to the north and west (fog turns them blue with distance).
const RING_LAYERS = [
  { r: 300, h: 55, base: -4, seed: 1, seg: 480, snow: 2, low: '#5f6e44', high: '#7c7a5a' },
  { r: 380, h: 105, base: -6, seed: 2, seg: 480, snow: 0.62, low: '#5d6a52', high: '#7d7f7c' },
  { r: 480, h: 190, base: -8, seed: 3, seg: 560, snow: 0.4, low: '#64707a', high: '#8b929b' },
];

const SNOW = new THREE.Color('#f4f6fa');

function ridgeGeometry(l: (typeof RING_LAYERS)[number]) {
  const { r, h, base, seed, seg, snow } = l;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const thick = r * 0.22;
  const rows = 6; // profile rows from front foot to crest to back foot
  const low = new THREE.Color(l.low);
  const high = new THREE.Color(l.high);
  const c = new THREE.Color();
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // taller to the north (-z) and west (-x)
    const bias = 0.35 + 0.65 * smoothstep(0.2, -0.9, sa * 0.8 + ca * 0.45);
    const n = fbm(ca * 2.4 + seed * 10, sa * 2.4 + seed * 5, 5);
    const sharp = Math.pow(Math.abs(fbm(ca * 7 + seed, sa * 7 - seed, 3) - 0.5) * 2, 1.4); // craggy peaks
    const peak = base + h * bias * (0.2 + 0.65 * n + 0.35 * sharp * bias);
    for (let j = 0; j <= rows; j++) {
      const t = j / rows; // 0 front foot, 0.5 crest, 1 back foot
      const prof = Math.sin(t * Math.PI);
      const rr = r - thick + t * thick * 2;
      const y = base + (peak - base) * Math.pow(prof, 0.8);
      pos.push(ca * rr, y, sa * rr);
      const k = (y - base) / Math.max(1, h);
      c.copy(low).lerp(high, smoothstep(0.1, 0.55, k));
      c.lerp(SNOW, smoothstep(snow - 0.08, snow + 0.05, k + n * 0.15));
      col.push(c.r, c.g, c.b);
    }
    if (i < seg) {
      for (let j = 0; j < rows; j++) {
        const k0 = i * (rows + 1) + j;
        const k1 = k0 + rows + 1;
        idx.push(k0, k1, k0 + 1, k0 + 1, k1, k1 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Mountains() {
  const layers = useMemo(() => RING_LAYERS.map((l) => ({ key: l.r, geo: ridgeGeometry(l) })), []);
  return (
    <group>
      {layers.map((l) => (
        <mesh key={l.key} geometry={l.geo}>
          <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
