import * as THREE from 'three';

// Procedural modeling helpers.
//
// loft(): sweeps an elliptical cross-section along a smooth spline through key
// sections, giving one continuous, seamless surface (horse bodies, necks,
// limbs, camels...). Radii are interpolated with the same Catmull-Rom
// parameterisation as the centre line so the silhouette flows between keys.

export interface LoftKey {
  p: [number, number, number]; // section centre
  rx: number; // half width (sideways)
  ryT: number; // half height toward the "up" side
  ryB?: number; // half height toward the "down" side (defaults to ryT)
}

export interface LoftOptions {
  up?: [number, number, number]; // reference up used to orient sections
  radial?: number; // vertices per ring
  steps?: number; // rings per key span
  capStart?: boolean;
  capEnd?: boolean;
  /** optional per-vertex colour from (position, ring t 0..1, angle) */
  color?: (p: THREE.Vector3, t: number, a: number, out: THREE.Color) => void;
  /** optional radial displacement (e.g. muscle definition, fabric folds) */
  displace?: (t: number, a: number) => number;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function loft(keys: LoftKey[], opt: LoftOptions = {}) {
  const radial = opt.radial ?? 18;
  const steps = opt.steps ?? 6;
  const upRef = new THREE.Vector3(...(opt.up ?? [0, 1, 0])).normalize();
  const n = keys.length;
  const get = (i: number) => keys[Math.max(0, Math.min(n - 1, i))];

  // sample rings
  const rings: { c: THREE.Vector3; rx: number; ryT: number; ryB: number }[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const k0 = get(i - 1);
      const k1 = get(i);
      const k2 = get(i + 1);
      const k3 = get(i + 2);
      const c = new THREE.Vector3(
        catmull(k0.p[0], k1.p[0], k2.p[0], k3.p[0], t),
        catmull(k0.p[1], k1.p[1], k2.p[1], k3.p[1], t),
        catmull(k0.p[2], k1.p[2], k2.p[2], k3.p[2], t)
      );
      const rb = (k: LoftKey) => k.ryB ?? k.ryT;
      rings.push({
        c,
        rx: Math.max(0.001, catmull(k0.rx, k1.rx, k2.rx, k3.rx, t)),
        ryT: Math.max(0.001, catmull(k0.ryT, k1.ryT, k2.ryT, k3.ryT, t)),
        ryB: Math.max(0.001, catmull(rb(k0), rb(k1), rb(k2), rb(k3), t)),
      });
    }
  }
  const last = keys[n - 1];
  rings.push({ c: new THREE.Vector3(...last.p), rx: last.rx, ryT: last.ryT, ryB: last.ryB ?? last.ryT });

  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const v = new THREE.Vector3();
  const color = new THREE.Color();
  const R = rings.length;

  for (let r = 0; r < R; r++) {
    const prev = rings[Math.max(0, r - 1)].c;
    const next = rings[Math.min(R - 1, r + 1)].c;
    tan.subVectors(next, prev).normalize();
    side.crossVectors(upRef, tan);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(tan, side).normalize();
    const ring = rings[r];
    const tr = r / (R - 1);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const d = 1 + (opt.displace ? opt.displace(tr, a) : 0);
      const ry = sa >= 0 ? ring.ryT : ring.ryB;
      v.copy(ring.c)
        .addScaledVector(side, ca * ring.rx * d)
        .addScaledVector(up, sa * ry * d);
      pos.push(v.x, v.y, v.z);
      if (opt.color) {
        opt.color(v, tr, a, color);
        col.push(color.r, color.g, color.b);
      }
    }
  }
  for (let r = 0; r < R - 1; r++) {
    for (let j = 0; j < radial; j++) {
      const a = r * radial + j;
      const b = r * radial + ((j + 1) % radial);
      const c = (r + 1) * radial + j;
      const d = (r + 1) * radial + ((j + 1) % radial);
      idx.push(a, b, c, b, d, c);
    }
  }
  // caps: fan to a pole slightly beyond the end so ends look rounded
  const cap = (r: number, dir: number) => {
    const ring = rings[r];
    const other = rings[Math.max(0, Math.min(R - 1, r - dir))].c;
    const pole = ring.c.clone().add(ring.c.clone().sub(other).normalize().multiplyScalar(Math.min(ring.rx, ring.ryT) * 0.6));
    const pi = pos.length / 3;
    pos.push(pole.x, pole.y, pole.z);
    if (opt.color) {
      opt.color(pole, r === 0 ? 0 : 1, 0, color);
      col.push(color.r, color.g, color.b);
    }
    for (let j = 0; j < radial; j++) {
      const a = r * radial + j;
      const b = r * radial + ((j + 1) % radial);
      if (dir > 0) idx.push(pi, a, b);
      else idx.push(pi, b, a);
    }
  };
  if (opt.capStart !== false) cap(0, -1);
  if (opt.capEnd !== false) cap(R - 1, 1);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (opt.color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sphere displaced by a shaping function of the unit direction (sculpted heads, wool, rocks). */
export function sculpt(radius: number, wSeg: number, hSeg: number, shape: (d: THREE.Vector3) => THREE.Vector3) {
  const g = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const p = g.attributes.position as THREE.BufferAttribute;
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).divideScalar(radius);
    const o = shape(d.clone());
    p.setXYZ(i, o.x, o.y, o.z);
  }
  g.computeVertexNormals();
  return g;
}

const sm = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export { sm as smoothstep01 };

/**
 * A human head as one continuous surface: egg-shaped cranium, narrower jaw
 * and chin, flat broad cheekbones (typical of Mongolian faces), brow ridge,
 * shallow eye sockets and a low-bridged nose, all from one displaced sphere.
 */
export function headGeometry() {
  return sculpt(1, 40, 32, (d) => {
    const { x, y, z } = d;
    let sx = 0.092;
    let sy = 0.118;
    let sz = 0.104;
    // jaw narrows toward the chin, cheekbones widen the mid-face
    const lower = sm(0.0, -0.9, y);
    sx *= 1 - lower * 0.28 + sm(-0.5, 0.0, y) * sm(0.35, -0.2, y) * 0.1;
    sz *= 1 - lower * 0.12;
    // flatten the back of the head slightly and the face plane
    if (z < 0) sz *= 1 - (-z) * 0.06;
    if (z > 0.4) sz *= 1 - (z - 0.4) * 0.12;
    let p = new THREE.Vector3(x * sx, y * sy, z * sz);
    // chin forward
    p.z += sm(-0.55, -0.95, y) * sm(0.3, 0.8, z) * 0.012;
    // brow ridge
    p.z += Math.exp(-((y - 0.2) ** 2) / 0.006) * sm(0.6, 0.95, z) * 0.006;
    // eye sockets
    for (const sx2 of [0.33, -0.33]) {
      const e = Math.exp(-(((x - sx2) ** 2) / 0.02 + ((y - 0.12) ** 2) / 0.008)) * sm(0.7, 0.95, z);
      p.z -= e * 0.008;
    }
    // nose: low bridge, soft rounded tip
    const nose = Math.exp(-((x * x) / 0.006)) * Math.exp(-(((y + 0.05) ** 2) / 0.03)) * sm(0.85, 1.0, z);
    p.z += nose * 0.022;
    // cheekbones push out at the sides of the face
    for (const s of [1, -1]) {
      const c = Math.exp(-(((x - s * 0.55) ** 2) / 0.03 + ((y + 0.02) ** 2) / 0.02)) * sm(0.3, 0.8, z);
      p.x += s * c * 0.006;
      p.z += c * 0.006;
    }
    return p;
  });
}
