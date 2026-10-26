import { create } from 'zustand';
import { QUESTS, type QuestId } from './content';
import { audio } from './audio';

export type Phase = 'title' | 'entering' | 'play';
export type Scene = 'outside' | 'inside';
export type Tod = 0 | 1 | 2; // morning, day, evening

export type Modal =
  | null
  | { type: 'info'; id: string }
  | { type: 'tea' }
  | { type: 'chest' }
  | { type: 'talk' }
  | { type: 'journal' }
  | { type: 'menu' };

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
  steps: Record<string, boolean>; // "quest.step"
  questsDone: QuestId[];
  circle: number; // radians walked around the ovoo (clockwise)
  tea: TeaState;
  toasts: Toast[];

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
}

let toastId = 0;

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
  circle: 0,
  tea: freshTea(),
  toasts: [],

  setPhase: (phase) => set({ phase }),
  setPrompt: (prompt) => {
    if (get().prompt !== prompt) set({ prompt });
  },
  setHover: (hover) => set({ hover }),
  setModal: (modal) => {
    // remember every knowledge card the player has opened (for the journal)
    if (modal?.type === 'info' && !get().steps[`info.${modal.id}`]) set({ steps: { ...get().steps, [`info.${modal.id}`]: true } });
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
  },
  setCircle: (circle) => set({ circle }),
  updateTea: (t) => set({ tea: { ...get().tea, ...t } }),
  resetTea: () => set({ tea: freshTea() }),
  toast: (text, sub) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, sub }].slice(-3) });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3600);
  },
}));

export function isDone(steps: Record<string, boolean>, quest: QuestId, step: string) {
  return !!steps[`${quest}.${step}`];
}

export function activeQuest(questsDone: QuestId[]) {
  return QUESTS.find((q) => !questsDone.includes(q.id)) ?? null;
}

// Per-frame mutable data shared between 3D components (kept out of React state).
export const world = {
  player: { x: 1.5, z: 7.5, y: 0, heading: 2.06, speed: 0 },
  horse: { x: 7.9, z: 3.5, heading: -Math.PI / 2, speed: 0 }, // tied facing the hitching line
  input: { x: 0, y: 0 }, // virtual joystick
  dragging: false,
  lastDrag: 0,
  time: 0,
};
