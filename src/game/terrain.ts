// Procedural height field for "The Living Valley". Everything that needs to
// stand on the ground (player, horses, grass, props) samples heightAt().

export const WORLD_SIZE = 640;
export const PLAY_RADIUS = 170;
export const WATER_Y = -0.55;

// Key locations (south = +z, east = +x). The ger door faces south.
export const LOC = {
  ger: { x: 0, z: 0 },
  door: { x: 0, z: 4.6 },
  hitch: { x: 6.5, z: 3.5 }, // hitching line with the saddled horse
  pasture: { x: 34, z: -10 }, // B: horse pasture
  riverBank: { x: 6, z: 35 }, // C: river bank viewpoint
  ovoo: { x: -66, z: -46 }, // D: hilltop ovoo
  farPasture: { x: 46, z: -62 }, // E: sheep & goats
  camels: { x: -20, z: -78 },
  argal: { x: -4.6, z: 3.2 },
  mother: { x: -1.9, z: 5.1 }, // Ээж, waiting by the door
};

function hash(x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function fbm(x: number, y: number, oct = 4) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * valueNoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function riverZ(x: number) {
  return 38 + 10 * Math.sin(x * 0.022) + 5 * Math.sin(x * 0.057 + 1.3);
}

export function riverDistance(x: number, z: number) {
  return Math.abs(z - riverZ(x));
}

function hill(x: number, z: number, cx: number, cz: number, r: number, h: number) {
  const d = Math.hypot(x - cx, z - cz) / r;
  return d >= 1 ? 0 : h * smooth(1 - d) ;
}

export function heightAt(x: number, z: number) {
  // Gentle rolling steppe
  let y = (fbm(x * 0.006 + 10, z * 0.006 - 4) - 0.5) * 14;
  y += (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 1.2;

  // Hills (D) and a long ridge to the north
  y += hill(x, z, LOC.ovoo.x, LOC.ovoo.z, 48, 19);
  y += hill(x, z, -30, -70, 40, 10);
  y += hill(x, z, 80, -90, 55, 16);
  y += smoothstep(-90, -190, z) * 38 * (0.6 + fbm(x * 0.01, 3.1) * 0.8);
  y += smoothstep(120, 230, Math.hypot(x, z)) * 30 * fbm(x * 0.015, z * 0.015);

  // Flatten the ger camp
  const r = Math.hypot(x, z);
  y = y * smoothstep(9, 24, r);

  // Carve the river
  const d = riverDistance(x, z);
  // wide, gentle floodplain, then a low cut bank down to the water
  const plain = smoothstep(32, 10, d);
  y = y * (1 - plain * 0.85) + 0.2 * plain;
  const bank = smoothstep(8.5, 4.5, d);
  y = y * (1 - bank) + -1.5 * bank;
  return y;
}

export function isInRiver(x: number, z: number) {
  // only the river channel is deep water; low hollows elsewhere are dry ground
  return riverDistance(x, z) < 8 && heightAt(x, z) < WATER_Y - 0.25;
}

/** Pitch (radians, + = nose up) of the ground along a heading, for aligning animals to slopes. */
export function slopePitch(x: number, z: number, heading: number, half = 0.6) {
  const fx = Math.sin(heading) * half;
  const fz = Math.cos(heading) * half;
  return Math.atan2(heightAt(x + fx, z + fz) - heightAt(x - fx, z - fz), half * 2);
}
