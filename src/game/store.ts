import { create } from 'zustand';
import { INFO, ITEMS, NPCS, QUESTS, questOrder, type NpcId, type QuestId, type StartPref } from './content';
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
  | { type: 'menu' };

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
  return { name: d.profile.name, woman: d.profile.woman, xp: d.xp, quests: d.questsDone.length, savedAt: d.savedAt };
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
      inventory: {},
      activitiesDone: [],
      circle: 0,
      penned: 0,
      gateOpen: false,
      tea: freshTea(),
      tod: 0,
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
      phase: 'entering',
    });
    world.intro = false;
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
        .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
        .join(', ');
      s.toast(`${def.title}: дутуу зүйл байна`, `Хэрэгтэй: ${missing}`);
      audio.click();
      return;
    }
    world.pose = def.pose;
    set({ activity: { id, step: 0 }, modal: { type: 'activity' } });
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
    // finished: swap items, reward, unlock knowledge, advance the quest
    s.addItems(Object.fromEntries(Object.entries(def.consumes).map(([k, n]) => [k, -n])));
    s.addItems(def.gives);
    set({
      activity: { id: a.id, step: def.steps.length },
      activitiesDone: s.activitiesDone.includes(def.id) ? s.activitiesDone : [...s.activitiesDone, def.id],
      xp: get().xp + def.xp,
    });
    world.pose = 'cheer';
    world.cheer = 2;
    const gained = Object.entries(def.gives)
      .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
      .join(', ');
    get().toast(`${def.title} — амжилттай`, `+${def.xp} · Олсон: ${gained}`);
    for (const k of def.knowledge) get().learn(k);
    if (def.quest) get().complete(def.quest[0], def.quest[1]);
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
}));

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
    if (s.inventory === prev.inventory && s.steps === prev.steps && s.gateOpen === prev.gateOpen && s.penned === prev.penned) return;
    if (t) clearTimeout(t);
    t = window.setTimeout(() => useGame.getState().saveNow(true), 2000);
  });
  window.setInterval(() => {
    if (useGame.getState().phase === 'play') useGame.getState().saveNow(true);
  }, 20000);
  useGame.setState({ hasSave: hasSaveData() });
}

