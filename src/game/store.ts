import { create } from 'zustand';
import {
  CHORES,
  CHORES_PER_DAY,
  DAILY_GIFTS,
  INFO,
  ITEM_SOURCE,
  ITEMS,
  NPCS,
  QUESTS,
  questOrder,
  REQUESTS,
  START_ITEMS,
  honorTitle,
  type ChoreId,
  type NpcId,
  type QuestId,
  type StartPref,
} from './content';
import { ACTIVITIES } from './activities';
import { audio } from './audio';

// Game flow: title → create (character, look, starting activity) → entering
// (camera flies in) → play. Continue skips creation by loading a save.
export type Phase = 'title' | 'create' | 'entering' | 'play';
export type Scene = 'outside' | 'inside';
export type Tod = 0 | 1 | 2; // morning, day, evening

export type Modal =
  | null
  | { type: 'info'; id: string }
  | { type: 'tea' }
  | { type: 'chest' }
  | { type: 'npc'; id: NpcId }
  | { type: 'activity' }
  | { type: 'inventory' }
  | { type: 'journal' }
  | { type: 'menu' }
  | { type: 'race' };

export interface Chore {
  id: ChoreId;
  done: boolean;
}
export interface Mastery {
  best: number; // best star rating 1..3
  times: number;
}
export interface Records {
  races: number;
  wins: number;
  best: number | null; // best race time, seconds
}
export interface DayRequest {
  id: string;
  done: boolean;
}

/** What the tea needs on the fire: water in the pot, аргал under it, milk to add. */
export const TEA_NEEDS: Record<string, number> = { water: 1, argal: 1, milk: 1 };

export interface RaceResult {
  place: number;
  time: number;
  best: boolean; // a new best time
  xp: number;
}

export interface Profile {
  name: string;
  woman: boolean;
  deel: string;
  sash: string;
  hatStyle: 'malgai' | 'toortsog' | 'scarf' | 'none';
  headColor: string;
  hair: 'short' | 'braid' | 'twobraids';
  boots: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Тэмүүлэн',
  woman: false,
  deel: '#2a5a96',
  sash: '#e39b2f',
  hatStyle: 'malgai',
  headColor: '#9e2a1c',
  hair: 'short',
  boots: '#5a1f14',
};

export interface TeaState {
  step: number; // 0 pot, 1 water, 2 boil, 3 tea leaves, 4 milk & salt, 5 ladle, 6 serve, 7 done
  water: number; // 0..1
  boil: number; // 0..1
  added: string[];
  ladles: number;
  cups: number; // filled cups 0..3
}

const freshTea = (): TeaState => ({ step: 0, water: 0, boil: 0, added: [], ladles: 0, cups: 0 });

interface Toast {
  id: number;
  text: string;
  sub?: string;
}

interface GameState {
  phase: Phase;
  scene: Scene;
  fading: boolean;
  mounted: boolean;
  doorOpen: boolean;
  gateOpen: boolean;
  tod: Tod;
  soundOn: boolean;
  prompt: string | null;
  hover: string | null;
  modal: Modal;
  xp: number;
  steps: Record<string, boolean>; // "quest.step" and "info.<id>"
  questsDone: QuestId[];
  questOrder: QuestId[];
  circle: number; // laps walked around the ovoo (clockwise)
  tea: TeaState;
  toasts: Toast[];
  profile: Profile;
  startPref: StartPref | null;
  inventory: Record<string, number>;
  activity: { id: string; step: number } | null;
  activitiesDone: string[];
  penned: number; // loose sheep driven into the pen
  hasSave: boolean;
  day: number;
  chores: Chore[];
  mastery: Record<string, Mastery>;
  /** mistakes in the running activity (for its star rating) */
  misses: number;
  records: Records;
  raceResult: RaceResult | null;
  racing: boolean;
  streak: number; // calendar days played in a row
  lastDate: string;
  honor: number; // нэр хүнд earned by helping the neighbours
  request: DayRequest | null; // today's request from a neighbour
  milked: number[]; // cows already milked today
  argalTaken: number[]; // аргал patches gathered today

  setPhase: (p: Phase) => void;
  setPrompt: (p: string | null) => void;
  setHover: (h: string | null) => void;
  setModal: (m: Modal) => void;
  setMounted: (m: boolean) => void;
  setDoor: (open: boolean) => void;
  toggleGate: () => void;
  setTod: (t: Tod) => void;
  cycleTod: () => void;
  toggleSound: () => void;
  goScene: (s: Scene) => void;
  complete: (quest: QuestId, step: string) => void;
  setCircle: (r: number) => void;
  updateTea: (t: Partial<TeaState>) => void;
  resetTea: () => void;
  toast: (text: string, sub?: string) => void;

  newJourney: () => void;
  beginJourney: (profile: Profile, pref: StartPref) => void;
  continueJourney: () => boolean;
  saveNow: (quiet?: boolean) => void;
  learn: (infoId: string, open?: boolean) => void;
  addItems: (items: Record<string, number>) => void;
  hasItems: (items: Record<string, number>) => boolean;
  startActivity: (id: string) => void;
  activityNext: () => void;
  cancelActivity: () => void;
  setPenned: (n: number) => void;
  miss: () => void;
  chore: (id: ChoreId) => void;
  refreshChores: () => void;
  sleep: () => void;
  setRacing: (on: boolean) => void;
  finishRace: (place: number, time: number) => void;
  fulfillRequest: () => void;
  pickArgal: (i: number) => void;
  fetchWater: () => void;
  teaServed: () => void;
}

let toastId = 0;

// ---------------------------------------------------------------- save / load

const SAVE_KEY = 'nomadverse.save.v1';

interface SaveData {
  v: 1;
  profile: Profile;
  startPref: StartPref | null;
  questOrder: QuestId[];
  xp: number;
  steps: Record<string, boolean>;
  questsDone: QuestId[];
  inventory: Record<string, number>;
  activitiesDone: string[];
  circle: number;
  penned: number;
  gateOpen: boolean;
  tod: Tod;
  pos: { x: number; z: number; heading: number };
  savedAt: number;
  day: number;
  chores: Chore[];
  mastery: Record<string, Mastery>;
  records: Records;
  streak: number;
  lastDate: string;
  honor: number;
  request: DayRequest | null;
  milked: number[];
  argalTaken: number[];
}

const QUEST_IDS = new Set(QUESTS.map((q) => q.id));

function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<SaveData>;
    // validate the parts that would break the game if malformed
    if (d.v !== 1 || !d.profile || typeof d.profile.woman !== 'boolean') return null;
    const num = (n: unknown, f = 0) => (typeof n === 'number' && isFinite(n) ? n : f);
    const obj = <T,>(o: unknown, f: T) => (o && typeof o === 'object' && !Array.isArray(o) ? (o as T) : f);
    const order = Array.isArray(d.questOrder) ? d.questOrder.filter((q) => QUEST_IDS.has(q)) : [];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj(d.inventory, {} as Record<string, number>))) if (ITEMS[k] && num(v) > 0) inv[k] = Math.floor(num(v));
    return {
      v: 1,
      profile: { ...DEFAULT_PROFILE, ...d.profile },
      startPref: d.startPref ?? null,
      // quests added in later versions are appended so old saves still see them
      questOrder: [...order, ...questOrder(d.startPref ?? null).filter((q) => !order.includes(q))],
      xp: num(d.xp),
      steps: obj(d.steps, {}),
      questsDone: Array.isArray(d.questsDone) ? d.questsDone.filter((q) => QUEST_IDS.has(q)) : [],
      inventory: inv,
      activitiesDone: Array.isArray(d.activitiesDone) ? d.activitiesDone.filter((a) => typeof a === 'string') : [],
      circle: num(d.circle),
      penned: num(d.penned),
      gateOpen: !!d.gateOpen,
      tod: ([0, 1, 2].includes(num(d.tod)) ? num(d.tod) : 0) as Tod,
      pos: { x: num(d.pos?.x, 1.5), z: num(d.pos?.z, 7.5), heading: num(d.pos?.heading, 2) },
      savedAt: num(d.savedAt),
      // added with daily life; older saves start on day 1
      day: Math.max(1, Math.floor(num(d.day, 1))),
      chores: Array.isArray(d.chores) ? d.chores.filter((c) => c && CHORES[c.id as ChoreId]).map((c) => ({ id: c.id, done: !!c.done })) : [],
      mastery: Object.fromEntries(
        Object.entries(obj(d.mastery, {} as Record<string, Mastery>)).map(([k, m]) => [k, { best: Math.min(3, num(m?.best)), times: num(m?.times) }])
      ),
      records: {
        races: num(d.records?.races),
        wins: num(d.records?.wins),
        best: typeof d.records?.best === 'number' && d.records.best > 0 ? d.records.best : null,
      },
      streak: Math.max(1, num(d.streak, 1)),
      lastDate: typeof d.lastDate === 'string' ? d.lastDate : '',
      honor: num(d.honor),
      request: d.request && REQUESTS.some((r) => r.id === d.request?.id) ? { id: d.request.id, done: !!d.request.done } : null,
      milked: Array.isArray(d.milked) ? d.milked.filter((n) => typeof n === 'number') : [],
      argalTaken: Array.isArray(d.argalTaken) ? d.argalTaken.filter((n) => typeof n === 'number') : [],
    };
  } catch {
    return null;
  }
}

export function hasSaveData() {
  return readSave() !== null;
}

/** Short description of the saved journey for the title screen. */
export function saveSummary() {
  const d = readSave();
  if (!d) return null;
  return { name: d.profile.name, woman: d.profile.woman, xp: d.xp, quests: d.questsDone.length, savedAt: d.savedAt, day: d.day, streak: d.streak };
}

/** Local calendar date, e.g. 2026-10-28 (for the daily return gift). */
function today(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Pick the day's chores from what the player has learned (varies by day). */
function pickChores(day: number, questsDone: QuestId[], activitiesDone: string[], keep: Chore[] = []): Chore[] {
  const open = (Object.keys(CHORES) as ChoreId[]).filter(
    (id) => CHORES[id].unlocked({ questsDone, activitiesDone }) && !keep.some((c) => c.id === id)
  );
  // deterministic shuffle by day so a reload doesn't reroll
  const rnd = (i: number) => {
    const k = Math.sin((day + 1) * 12.9898 + i * 78.233) * 43758.5453;
    return k - Math.floor(k);
  };
  const order = open.map((id, i) => ({ id, k: rnd(i) })).sort((a, b) => a.k - b.k);
  return [...keep, ...order.map((o) => ({ id: o.id, done: false }))].slice(0, CHORES_PER_DAY);
}

/** A neighbour's request for the day, from the crafts the player already knows. */
function pickRequest(day: number, questsDone: QuestId[], activitiesDone: string[]): DayRequest | null {
  const open = REQUESTS.filter((r) => r.unlocked({ questsDone, activitiesDone }));
  if (!open.length) return null;
  return { id: open[(day * 7 + 3) % open.length].id, done: false };
}

const QUALITY_KEY = 'nomadverse.quality';
export type Quality = 'auto' | 'high' | 'low';
export function getQuality(): Quality {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    return q === 'high' || q === 'low' ? q : 'auto';
  } catch {
    return 'auto';
  }
}
export function setQuality(q: Quality) {
  try {
    localStorage.setItem(QUALITY_KEY, q);
  } catch {
    /* storage unavailable: keep automatic quality */
  }
}

// ---------------------------------------------------------------- store

export const useGame = create<GameState>((set, get) => ({
  phase: 'title',
  scene: 'outside',
  fading: false,
  mounted: false,
  doorOpen: false,
  gateOpen: false,
  tod: 0,
  soundOn: true,
  prompt: null,
  hover: null,
  modal: null,
  xp: 0,
  steps: {},
  questsDone: [],
  questOrder: questOrder(null),
  circle: 0,
  tea: freshTea(),
  toasts: [],
  profile: DEFAULT_PROFILE,
  startPref: null,
  inventory: {},
  activity: null,
  activitiesDone: [],
  penned: 0,
  hasSave: false,
  day: 1,
  chores: [],
  mastery: {},
  misses: 0,
  records: { races: 0, wins: 0, best: null },
  raceResult: null,
  racing: false,
  streak: 1,
  lastDate: '',
  honor: 0,
  request: null,
  milked: [],
  argalTaken: [],

  setPhase: (phase) => set({ phase }),
  setPrompt: (prompt) => {
    if (get().prompt !== prompt) set({ prompt });
  },
  setHover: (hover) => set({ hover }),
  setModal: (modal) => {
    // remember every knowledge card the player has opened (for the journal)
    if (modal?.type === 'info') get().learn(modal.id);
    set({ modal });
  },
  setMounted: (mounted) => set({ mounted }),
  setDoor: (doorOpen) => set({ doorOpen }),
  toggleGate: () => set({ gateOpen: !get().gateOpen }),
  setTod: (tod) => set({ tod }),
  cycleTod: () => set({ tod: ((get().tod + 1) % 3) as Tod }),
  toggleSound: () => {
    const soundOn = !get().soundOn;
    audio.setEnabled(soundOn);
    set({ soundOn });
  },
  goScene: (scene) => {
    if (get().fading || get().scene === scene) return;
    set({ fading: true, prompt: null, hover: null });
    setTimeout(() => {
      // stepping back out: the door is open behind you, then swings shut
      set({ scene, modal: null, doorOpen: scene === 'outside' });
      if (scene === 'outside') setTimeout(() => set({ doorOpen: false }), 1600);
      audio.setScene(scene);
      setTimeout(() => set({ fading: false }), 120);
    }, 450);
  },
  complete: (quest, step) => {
    const key = `${quest}.${step}`;
    const s = get();
    if (s.steps[key]) return;
    const steps = { ...s.steps, [key]: true };
    const def = QUESTS.find((q) => q.id === quest)!;
    const label = def.steps.find((x) => x.id === step)?.label ?? step;
    const finished = def.steps.every((x) => steps[`${quest}.${x.id}`]);
    if (finished) {
      set({ steps, xp: s.xp + def.xp, questsDone: [...s.questsDone, quest] });
      get().refreshChores();
      audio.success();
      world.cheer = 2.2;
      get().toast(`${def.title} — дууслаа`, `+${def.xp} туршлагын оноо`);
      if (get().questsDone.length === QUESTS.length) {
        setTimeout(() => {
          get().toast('Нар жаргаж байна', 'Тал нутгийн үдшийг мэдэр. T товчоор цагийг сольж болно.');
          set({ tod: 2 });
        }, 2500);
      }
    } else {
      set({ steps, xp: s.xp + 5 });
      audio.tick();
      get().toast(label, '+5');
    }
    get().saveNow(true);
  },
  setCircle: (circle) => set({ circle }),
  updateTea: (t) => set({ tea: { ...get().tea, ...t } }),
  resetTea: () => set({ tea: freshTea() }),
  toast: (text, sub) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, sub }].slice(-3) });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3600);
  },

  // ---- journey
  newJourney: () => set({ phase: 'create', modal: null }),
  beginJourney: (profile, pref) => {
    set({
      profile,
      startPref: pref,
      questOrder: questOrder(pref),
      xp: 0,
      steps: {},
      questsDone: [],
      inventory: { ...START_ITEMS },
      activitiesDone: [],
      circle: 0,
      penned: 0,
      gateOpen: false,
      tea: freshTea(),
      tod: 0,
      honor: 0,
      request: null,
      milked: [],
      argalTaken: [],
      day: 1,
      chores: [],
      mastery: {},
      records: { races: 0, wins: 0, best: null },
      streak: 1,
      lastDate: today(),
      phase: 'entering',
    });
    world.intro = true;
    world.player.x = 1.5;
    world.player.z = 7.5;
    world.player.heading = 2.06;
    get().saveNow(true);
  },
  continueJourney: () => {
    const d = readSave();
    if (!d) {
      set({ hasSave: false });
      get().toast('Хадгалсан аялал олдсонгүй', 'Шинэ аялал эхлүүлнэ үү');
      return false;
    }
    set({
      profile: d.profile,
      startPref: d.startPref,
      questOrder: d.questOrder,
      xp: d.xp,
      steps: d.steps,
      questsDone: d.questsDone,
      inventory: d.inventory,
      activitiesDone: d.activitiesDone,
      circle: d.circle,
      penned: d.penned,
      gateOpen: d.gateOpen,
      tod: d.tod,
      day: d.day,
      chores: d.chores,
      mastery: d.mastery,
      records: d.records,
      streak: d.streak,
      lastDate: d.lastDate,
      honor: d.honor,
      request: d.request,
      milked: d.milked,
      argalTaken: d.argalTaken,
      phase: 'entering',
    });
    world.intro = false;
    // coming back on a new calendar day: a small gift, more for a streak
    const now = today();
    if (d.lastDate !== now) {
      const streak = d.lastDate === today(-1) ? d.streak + 1 : 1;
      const gift = DAILY_GIFTS[(streak - 1) % DAILY_GIFTS.length];
      const bonus = 10 * Math.min(streak, 7);
      set({ streak, lastDate: now, xp: get().xp + bonus });
      get().addItems(gift);
      const names = Object.entries(gift)
        .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
        .join(', ');
      setTimeout(
        () => get().toast(streak > 1 ? `${streak} өдөр дараалан ирлээ!` : 'Эргэн ирсэнд баяртай байна', `Өдрийн бэлэг: ${names} · +${bonus} XP`),
        3200
      );
    }
    get().refreshChores();
    world.player.x = d.pos.x;
    world.player.z = d.pos.z;
    world.player.heading = d.pos.heading;
    world.resume = true;
    return true;
  },
  saveNow: (quiet) => {
    const s = get();
    if (s.phase !== 'play' && s.phase !== 'entering') return;
    const data: SaveData = {
      v: 1,
      profile: s.profile,
      startPref: s.startPref,
      questOrder: s.questOrder,
      xp: s.xp,
      steps: s.steps,
      questsDone: s.questsDone,
      inventory: s.inventory,
      activitiesDone: s.activitiesDone,
      circle: s.circle,
      penned: s.penned,
      gateOpen: s.gateOpen,
      tod: s.tod,
      pos: { x: world.player.x, z: world.player.z, heading: world.player.heading },
      savedAt: Date.now(),
      day: s.day,
      chores: s.chores,
      mastery: s.mastery,
      records: s.records,
      streak: s.streak,
      lastDate: s.lastDate,
      honor: s.honor,
      request: s.request,
      milked: s.milked,
      argalTaken: s.argalTaken,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      set({ hasSave: true });
      if (!quiet) get().toast('Хадгалагдлаа', 'Дараа нь "Үргэлжлүүлэх"-ээр эхэлнэ');
    } catch {
      if (!quiet) get().toast('Хадгалж чадсангүй', 'Хөтчийн хадгалах сан хаалттай байж магадгүй');
    }
  },

  // ---- knowledge
  learn: (id, open) => {
    const s = get();
    if (!INFO[id]) return;
    if (!s.steps[`info.${id}`]) {
      set({ steps: { ...s.steps, [`info.${id}`]: true }, xp: s.xp + 10 });
      get().toast(`Шинэ мэдлэг: ${INFO[id].title}`, '+10 · Монгол өвийн мэдлэг');
    }
    if (open) set({ modal: { type: 'info', id } });
  },

  // ---- inventory
  addItems: (items) => {
    const inv = { ...get().inventory };
    for (const [k, n] of Object.entries(items)) {
      inv[k] = (inv[k] ?? 0) + n;
      if (inv[k] <= 0) delete inv[k];
    }
    set({ inventory: inv });
  },
  hasItems: (items) => Object.entries(items).every(([k, n]) => (get().inventory[k] ?? 0) >= n),

  // ---- activities
  startActivity: (id) => {
    const def = ACTIVITIES[id];
    const s = get();
    if (!def) return;
    if (!s.hasItems(def.requires)) {
      const missing = Object.entries(def.requires)
        .filter(([k, n]) => (s.inventory[k] ?? 0) < n)
        .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}${ITEM_SOURCE[k] ? ` (${ITEM_SOURCE[k]})` : ''}`)
        .join(', ');
      s.toast(`${def.title}: дутуу зүйл байна`, `Хэрэгтэй: ${missing}`);
      audio.click();
      return;
    }
    if (def.pick) def.steps = def.pick(s.day); // today's riddles
    world.pose = def.pose;
    set({ activity: { id, step: 0 }, modal: { type: 'activity' }, misses: 0 });
  },
  activityNext: () => {
    const s = get();
    const a = s.activity;
    if (!a) return;
    const def = ACTIVITIES[a.id];
    if (a.step >= def.steps.length) return; // already finished: never reward twice
    if (a.step + 1 < def.steps.length) {
      audio.tick();
      set({ activity: { id: a.id, step: a.step + 1 } });
      return;
    }
    // finished: rate it, swap items, reward, unlock knowledge, advance the quest
    const stars = starsFor(s.misses);
    const gives = { ...def.gives };
    for (const [k, n] of Object.entries(bonusFor(def.id, stars))) gives[k] = (gives[k] ?? 0) + n;
    const xp = activityXp(def.xp, stars);
    const prev = s.mastery[def.id] ?? { best: 0, times: 0 };
    s.addItems(Object.fromEntries(Object.entries(def.consumes).map(([k, n]) => [k, -n])));
    s.addItems(gives);
    set({
      activity: { id: a.id, step: def.steps.length },
      activitiesDone: s.activitiesDone.includes(def.id) ? s.activitiesDone : [...s.activitiesDone, def.id],
      xp: get().xp + xp,
      mastery: { ...s.mastery, [def.id]: { best: Math.max(prev.best, stars), times: prev.times + 1 } },
    });
    world.pose = 'cheer';
    world.cheer = 2;
    const gained = Object.entries(gives)
      .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
      .join(', ');
    get().toast(`${def.title} — ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, gained ? `+${xp} · Олсон: ${gained}` : `+${xp} туршлага`);
    for (const k of def.knowledge) get().learn(k);
    if (def.quest) get().complete(def.quest[0], def.quest[1]);
    get().refreshChores();
    // riddles are once a day
    if (def.pick) set({ steps: { ...get().steps, [`${def.id}.${get().day}`]: true } });
    if (def.id in CHORES) get().chore(def.id as ChoreId);
    if (def.id === 'milking' && world.milkCow !== null) {
      if (!get().milked.includes(world.milkCow)) set({ milked: [...get().milked, world.milkCow] });
      world.milkCow = null;
    }
    audio.success();
    get().saveNow(true);
  },
  cancelActivity: () => {
    world.pose = 'stand';
    set({ activity: null, modal: null });
  },
  setPenned: (penned) => {
    if (penned !== get().penned) set({ penned });
  },
  miss: () => set({ misses: get().misses + 1 }),

  // ---- daily life
  chore: (id) => {
    get().refreshChores();
    const s = get();
    const c = s.chores.find((x) => x.id === id);
    if (!c || c.done) return;
    const chores = s.chores.map((x) => (x.id === id ? { ...x, done: true } : x));
    const left = chores.filter((x) => !x.done).length;
    set({ chores, xp: s.xp + 20 });
    // the sun moves with the day's work: noon after the first chore, dusk when all are done
    if (left === 0 && chores.length >= 2) {
      set({ tod: 2 });
      setTimeout(() => get().toast('Өнөөдрийн ажил дууслаа!', 'Нар жаргаж байна. Гэртээ орж орон дээрээ амраад шинэ өдрийг угтаарай.'), 1400);
    } else if (s.tod === 0 && left < chores.length - (chores.length >= 2 ? 0 : 1)) set({ tod: 1 });
    get().toast(`Өдрийн ажил: ${CHORES[id].title}`, `+20 · ${left ? `${left} ажил үлдлээ` : 'бүгд биеллээ'}`);
  },
  refreshChores: () => {
    // add newly learned work to a day that still has room for it
    const s = get();
    if (!s.request) {
      const request = pickRequest(s.day, s.questsDone, s.activitiesDone);
      if (request) set({ request });
    }
    if (s.chores.length >= CHORES_PER_DAY) return;
    const chores = pickChores(s.day, s.questsDone, s.activitiesDone, s.chores);
    if (chores.length !== s.chores.length) set({ chores });
  },
  sleep: () => {
    if (get().fading) return;
    set({ fading: true, prompt: null });
    setTimeout(() => {
      const st = get();
      const day = st.day + 1;
      set({
        day,
        tod: 0,
        chores: pickChores(day, st.questsDone, st.activitiesDone),
        request: pickRequest(day, st.questsDone, st.activitiesDone),
        milked: [],
        argalTaken: [],
        penned: 0,
        gateOpen: false,
        circle: 0,
        tea: freshTea(),
      });
      setTimeout(() => set({ fading: false }), 300);
      get().toast(`${day}-р өдөр`, 'Үүр цайж, шинэ өдөр эхэллээ. Өнөөдрийн ажлаа хараарай.');
      get().saveNow(true);
    }, 1400);
  },
  setRacing: (racing) => set({ racing }),

  // ---- the neighbours and the steppe's gifts
  fulfillRequest: () => {
    const s = get();
    const def = REQUESTS.find((r) => r.id === s.request?.id);
    if (!def || s.request?.done || !s.hasItems(def.needs)) return;
    const before = honorTitle(s.honor).label;
    s.addItems(Object.fromEntries(Object.entries(def.needs).map(([k, n]) => [k, -n])));
    s.addItems(def.gives);
    const honor = s.honor + def.honor;
    set({ request: { id: def.id, done: true }, honor, xp: get().xp + def.honor * 2 });
    audio.success();
    world.cheer = 2;
    const gained = Object.entries(def.gives)
      .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
      .join(', ');
    get().toast(`${NPCS[def.npc].name}: ачтай, ачтай!`, `+${def.honor} нэр хүнд · ${gained}`);
    const after = honorTitle(honor).label;
    if (after !== before) setTimeout(() => get().toast(`Шинэ нэр хүнд: ${after}`, 'Хотныхон чамайг улам хүндэлж байна'), 1800);
    get().saveNow(true);
  },
  pickArgal: (i) => {
    const s = get();
    if (s.argalTaken.includes(i)) return;
    const argalTaken = [...s.argalTaken, i];
    set({ argalTaken });
    s.addItems({ argal: 1 });
    audio.click();
    world.stoop = 0.9; // bend down to pick it up
    s.toast('Аргал түүлээ', `Өнөөдөр ${argalTaken.length} · Хатсан аргал утаа багатай, гал сайтай`);
    if (!s.steps['info.argal']) get().learn('argal');
    if (argalTaken.length >= 3) get().chore('argal');
  },
  fetchWater: () => {
    const s = get();
    s.addItems({ water: 2 });
    world.stoop = 0.9;
    audio.pour();
    s.toast('Голоос ус авлаа', 'Ус ×2 · Усыг бохирдуулалгүй, зөөлөн утгаж авдаг');
    if (!s.steps['info.water']) get().learn('water');
  },
  teaServed: () => {
    const s = get();
    // the pot used the household's water, аргал and milk; the tea is kept for guests
    s.addItems(Object.fromEntries(Object.entries(TEA_NEEDS).map(([k, n]) => [k, -Math.min(n, s.inventory[k] ?? 0)])));
    s.addItems({ tea: 1 });
    s.complete('tea', 'serve');
    s.chore('tea');
  },
  finishRace: (place, time) => {
    const s = get();
    const r = s.records;
    const best = r.best === null || time < r.best;
    const xp = [120, 70, 50, 35][place - 1] ?? 35;
    set({
      records: { races: r.races + 1, wins: r.wins + (place === 1 ? 1 : 0), best: best ? time : r.best },
      xp: s.xp + xp,
      raceResult: { place, time, best, xp },
      racing: false,
    });
    if (place === 1) get().addItems({ medal: 1 });
    get().learn('naadam');
    get().learn('uraldaan');
    get().chore('race');
    audio.success();
    world.cheer = 2.5;
    setTimeout(() => get().setModal({ type: 'race' }), 1300);
    get().saveNow(true);
  },
}));

/** Star rating from the mistakes made during an activity. */
export function starsFor(misses: number) {
  return misses === 0 ? 3 : misses <= 2 ? 2 : 1;
}

export function activityXp(base: number, stars: number) {
  return base + (stars - 1) * 10;
}

/** Extra produce for flawless work (not for the big crafts). */
export function bonusFor(id: string, stars: number): Record<string, number> {
  if (stars < 3) return {};
  if (id === 'milking') return { milk: 1 };
  if (id === 'aaruul') return { aaruul: 2 };
  if (id === 'shearing') return { wool: 1 };
  return {};
}

export function isDone(steps: Record<string, boolean>, quest: QuestId, step: string) {
  return !!steps[`${quest}.${step}`];
}

export function activeQuest(questsDone: QuestId[], order?: QuestId[]) {
  const ids = order ?? useGame.getState().questOrder;
  for (const id of ids) {
    if (!questsDone.includes(id)) return QUESTS.find((q) => q.id === id) ?? null;
  }
  return null;
}

export function npcName(id: NpcId) {
  return NPCS[id].name;
}

// Per-frame mutable data shared between 3D components (kept out of React state).
export const world = {
  player: { x: 1.5, z: 7.5, y: 0, heading: 2.06, speed: 0 },
  horse: { x: 7.9, z: 3.5, heading: -Math.PI / 2, speed: 0 }, // tied facing the hitching line
  dog: { x: -3.4, z: 4.6 },
  khuurInHand: false,
  inside: { x: 0, z: 2.4, heading: Math.PI, speed: 0 },
  /** short scripted walks through the ger door */
  cutscene: null as null | { type: 'enter' | 'exit' | 'arrive' | 'leave'; t: number },
  /** body pose for the player while an activity runs */
  pose: 'stand' as import('@/world/Human').HumanPose,
  /** seconds left of the celebration pose after finishing something */
  cheer: 0,
  /** seconds left of a short bend-down (picking something up) */
  stoop: 0,
  /** the cow being milked (each gives milk once a day) */
  milkCow: null as number | null,
  /** where the current activity happens (player is placed and faced there) */
  activitySpot: null as null | { x: number; z: number; heading: number },
  /** a new journey just started: show the guide's welcome once the camera lands */
  intro: false,
  /** loaded from a save: place the player at the saved spot when play begins */
  resume: false,
  input: { x: 0, y: 0 }, // virtual joystick
  dragging: false,
  lastDrag: 0,
  time: 0,
};

// autosave: a few seconds after progress changes, and every 20 s while playing
if (typeof window !== 'undefined') {
  let t: number | null = null;
  useGame.subscribe((s, prev) => {
    if (s.phase !== 'play') return;
    if (s.inventory === prev.inventory && s.steps === prev.steps && s.gateOpen === prev.gateOpen && s.penned === prev.penned && s.chores === prev.chores) return;
    if (t) clearTimeout(t);
    t = window.setTimeout(() => useGame.getState().saveNow(true), 2000);
  });
  window.setInterval(() => {
    if (useGame.getState().phase === 'play') useGame.getState().saveNow(true);
  }, 20000);
  useGame.setState({ hasSave: hasSaveData() });
}

