// Keyboard state as a plain object, read inside useFrame.

export const keys: Record<string, boolean> = {};
type Listener = (code: string) => void;
const pressListeners = new Set<Listener>();

let bound = false;
export function bindKeys() {
  if (bound) return;
  bound = true;
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!keys[e.code]) pressListeners.forEach((l) => l(e.code));
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });
}

export function onPress(l: Listener) {
  pressListeners.add(l);
  return () => {
    pressListeners.delete(l);
  };
}

/** Synthetic press, used by the touch "E" button. */
export function press(code: string) {
  pressListeners.forEach((l) => l(code));
}
