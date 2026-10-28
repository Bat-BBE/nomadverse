import * as THREE from 'three';
import { useGame, world } from './store';
import { audio } from './audio';

// Наадмын уралдаан: a two-lap horse race around flagged gates on the open
// steppe east of the camp. Course data, the racers and the live race state
// live here; world/Naadam.tsx draws it and runs it every frame.

const POINTS: [number, number][] = [
  [56, 6],
  [78, 10],
  [100, -6],
  [104, -28],
  [96, -52],
  [74, -58],
  [60, -40],
  [52, -18],
];

export const course = new THREE.CatmullRomCurve3(
  POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'centripetal'
);
export const COURSE_LEN = course.getLength();
export const GATES = 8; // gate GATES (= gate 0) is the start / finish line
export const LAPS = 3;
export const GATE_HALF = 6.5; // half the width between a gate's two posts
const SAMPLES = course.getSpacedPoints(300);

const tmp = new THREE.Vector3();
const tan = new THREE.Vector3();

/** Point on the course at lap fraction u (0..1, arc-length), pushed sideways by `lane` metres. */
export function coursePoint(u: number, lane = 0, out = new THREE.Vector3()) {
  const k = ((u % 1) + 1) % 1;
  course.getPointAt(k, out);
  course.getTangentAt(k, tan);
  // right-hand normal on the ground plane
  out.x += -tan.z * lane;
  out.z += tan.x * lane;
  return out;
}

export function courseHeading(u: number) {
  course.getTangentAt(((u % 1) + 1) % 1, tan);
  return Math.atan2(tan.x, tan.z);
}

export function gatePoint(k: number) {
  return coursePoint((k % GATES) / GATES, 0, tmp).clone();
}

export const START = gatePoint(0);
export const START_HEADING = courseHeading(0);
/** Where the race officials stand, off the left side of the start line. */
export const JUDGE_SPOT = coursePoint(0.012, -GATE_HALF - 3.5);

/** Distance from (x, z) to the course centre line. */
export function courseDistance(x: number, z: number) {
  let best = Infinity;
  for (const p of SAMPLES) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2);
  return Math.sqrt(best);
}

export const RACE_CENTER = { x: 78, z: -24 };

// the other riders: children, as in a real Naadam, on horses of different coats
export const RACERS = [
  { name: 'Тэмүүжин', deel: '#c23a26', sash: '#f2c230', coat: '#3a2416', mane: '#110a06', base: 14.8, lane: -3.4, seed: 21 },
  { name: 'Мишээл', deel: '#2f7d4f', sash: '#e8dcc0', coat: '#b98d55', mane: '#3a2817', base: 14.3, lane: 3.2, seed: 33, woman: true },
  { name: 'Ананд', deel: '#7a3f9e', sash: '#f0a63a', coat: '#d9cfc0', mane: '#8c8274', base: 15.2, lane: -1.4, seed: 47 },
] as const;

export interface AiRacer {
  s: number; // laps travelled (0..LAPS)
  v: number;
  lane: number;
  done: number; // finish time, or -1
}

export const race = {
  state: 'idle' as 'idle' | 'count' | 'run' | 'done',
  t: 0, // seconds since the countdown began
  time: 0, // race clock (from "go")
  gate: 0, // gates the player has passed (finish at GATES * LAPS)
  place: 0,
  ai: RACERS.map((r) => ({ s: 0, v: 0, lane: r.lane, done: -1 })) as AiRacer[],
};

/** The player's progress in gate units, comparable with an AI's `s * GATES`. */
export function playerProgress(x: number, z: number) {
  if (race.gate >= GATES * LAPS) return GATES * LAPS;
  const a = gatePoint(race.gate);
  const b = gatePoint(race.gate + 1);
  const seg = Math.hypot(b.x - a.x, b.z - a.z);
  const d = Math.hypot(b.x - x, b.z - z);
  return race.gate + THREE.MathUtils.clamp(1 - d / seg, 0, 0.99);
}

/** Current standing (1 = leading). */
export function standing(x: number, z: number) {
  if (race.state === 'done') return race.place;
  const me = playerProgress(x, z);
  return 1 + race.ai.filter((a) => a.done >= 0 || a.s * GATES > me).length;
}

/** Traditional names for the finishing places. */
export const PLACE_NAMES = ['Түрүү морь', 'Аман хүзүү', 'Айргийн тавд', 'Бөхөн тэргүүн'];
export const PLACE_TEXT = [
  'Түрүүлсэн морины хүзүүнд хадаг уяж, магнайд нь айраг цацаж цол дуудна. Уяач, унаач хоёрын нэр алдаршина.',
  'Хоёрдугаар байрт ирсэн морийг «аман хүзүү» гэдэг — түрүүгийнхээ амыг хүзүүгээрээ дагаж ирсэн гэсэн үг.',
  'Айргийн тавд орсон морьдыг айргаар цацаж, унаачдад нь шагнал гардуулдаг.',
  'Хамгийн сүүлд ирсэн морийг «бөхөн тэргүүн» гэж нэрлээд, ирэх жил хурдлаарай гэж ерөөл тавьдаг. Хэн ч гомдохгүй.',
];

/** Line the player's horse and the other riders up behind the start and begin the countdown. */
export function startRace() {
  const back = coursePoint(-0.022, 0);
  world.horse.x = back.x;
  world.horse.z = back.z;
  world.horse.heading = courseHeading(-0.022);
  world.horse.speed = 0;
  world.player.x = back.x;
  world.player.z = back.z;
  world.player.heading = world.horse.heading;
  race.state = 'count';
  race.t = 0;
  race.time = 0;
  race.gate = 0;
  race.place = 0;
  race.ai.forEach((a, i) => {
    a.s = -0.022;
    a.v = 0;
    a.lane = RACERS[i].lane;
    a.done = -1;
  });
  useGame.getState().setRacing(true);
  useGame.getState().setPrompt(null);
  audio.click();
}

/** Stop the race without a result (dismounted, rode off the course). */
export function abandonRace(why: string) {
  race.state = 'idle';
  useGame.getState().setRacing(false);
  useGame.getState().toast('Уралдаанаас гарлаа', why);
}
