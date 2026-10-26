import * as THREE from 'three';

// Time-of-day presets. The live `env` values are lerped toward the active
// preset each frame so switching morning/day/evening is a smooth transition.

interface Preset {
  skyTop: string;
  skyHorizon: string;
  skySun: string;
  ground: string;
  sun: string;
  sunIntensity: number;
  sunDir: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  stars: number;
  glow: number; // sun halo strength in the sky shader
  dayness: number;
}

export const PRESETS: Preset[] = [
  {
    // Golden hour: sun just above the north-eastern ridges, long warm light
    skyTop: '#2a5fb8',
    skyHorizon: '#f0c9a0',
    skySun: '#ffb46a',
    ground: '#c9a882',
    sun: '#ffcf96',
    sunIntensity: 3.1,
    sunDir: [0.72, 0.27, -0.6],
    hemiSky: '#b4c9ea',
    hemiGround: '#7a6448',
    hemiIntensity: 1.15,
    fog: '#e4c9a8',
    stars: 0,
    glow: 1.4,
    dayness: 1,
  },
  {
    // Midday: high, clear, deep blue
    skyTop: '#1f5fbf',
    skyHorizon: '#c8dcef',
    skySun: '#fff3dc',
    ground: '#b8c4a0',
    sun: '#fff6e8',
    sunIntensity: 3.0,
    sunDir: [0.3, 0.9, 0.25],
    hemiSky: '#cfe2ff',
    hemiGround: '#7d8a55',
    hemiIntensity: 1.1,
    fog: '#cddfee',
    stars: 0,
    glow: 0.35,
    dayness: 1,
  },
  {
    // Sunset: sun on the western horizon, violet sky overhead, first stars
    skyTop: '#1e2c5e',
    skyHorizon: '#e9946a',
    skySun: '#ff7a3c',
    ground: '#5a4a48',
    sun: '#ff9550',
    sunIntensity: 1.7,
    sunDir: [-0.85, 0.07, -0.25],
    hemiSky: '#5f6fb0',
    hemiGround: '#4a3a30',
    hemiIntensity: 0.7,
    fog: '#b07f84',
    stars: 0.8,
    glow: 1.6,
    dayness: 0.25,
  },
];

export const TOD_LABELS = ['Үүр цайх', 'Өдөр', 'Нар жаргах'];

const c = (s: string) => new THREE.Color(s);

export const env = {
  skyTop: c(PRESETS[0].skyTop),
  skyHorizon: c(PRESETS[0].skyHorizon),
  skySun: c(PRESETS[0].skySun),
  ground: c(PRESETS[0].ground),
  sun: c(PRESETS[0].sun),
  sunIntensity: PRESETS[0].sunIntensity,
  sunDir: new THREE.Vector3(...PRESETS[0].sunDir).normalize(),
  hemiSky: c(PRESETS[0].hemiSky),
  hemiGround: c(PRESETS[0].hemiGround),
  hemiIntensity: PRESETS[0].hemiIntensity,
  fog: c(PRESETS[0].fog),
  stars: 0,
  glow: 1,
  dayness: 1,
};

const tmpV = new THREE.Vector3();
const tmpC = new THREE.Color();

export function stepEnv(target: number, dt: number) {
  const p = PRESETS[target];
  const k = 1 - Math.exp(-dt * 1.4);
  env.skyTop.lerp(tmpC.set(p.skyTop), k);
  env.skyHorizon.lerp(tmpC.set(p.skyHorizon), k);
  env.skySun.lerp(tmpC.set(p.skySun), k);
  env.ground.lerp(tmpC.set(p.ground), k);
  env.sun.lerp(tmpC.set(p.sun), k);
  env.hemiSky.lerp(tmpC.set(p.hemiSky), k);
  env.hemiGround.lerp(tmpC.set(p.hemiGround), k);
  env.fog.lerp(tmpC.set(p.fog), k);
  env.sunDir.lerp(tmpV.set(...p.sunDir).normalize(), k).normalize();
  env.sunIntensity += (p.sunIntensity - env.sunIntensity) * k;
  env.hemiIntensity += (p.hemiIntensity - env.hemiIntensity) * k;
  env.stars += (p.stars - env.stars) * k;
  env.glow += (p.glow - env.glow) * k;
  env.dayness += (p.dayness - env.dayness) * k;
}
