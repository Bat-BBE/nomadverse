// Solid things on the ground plan, as circles. Static props register once;
// moving animals and people update their entries every frame. The player
// (and the ridden horse) cannot move into any of them.

export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** props that never move: posts, carts, rocks, barrels... */
export const staticColliders: Circle[] = [];
/** animals and people, updated in place every frame (key → circle) */
export const movers = new Map<string, Circle>();

export function addStatic(c: Circle | Circle[]) {
  for (const x of Array.isArray(c) ? c : [c]) staticColliders.push(x);
}

/** circles along a body (e.g. a horse) from its centre and heading */
export function bodyCircles(x: number, z: number, heading: number, half: number, r: number, n = 2): Circle[] {
  const out: Circle[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out.push({ x: x + Math.sin(heading) * half * t, z: z + Math.cos(heading) * half * t, r });
  }
  return out;
}

export function setMover(key: string, x: number, z: number, r: number) {
  const m = movers.get(key);
  if (m) {
    m.x = x;
    m.z = z;
    m.r = r;
  } else movers.set(key, { x, z, r });
}

/**
 * Is stepping from (x0,z0) to (x1,z1) blocked for a body of radius `self`?
 * A step is only refused if it goes deeper into an obstacle, so something that
 * walked into you can never trap you.
 */
export function stepBlocked(x0: number, z0: number, x1: number, z1: number, self: number, ignore?: string) {
  const test = (c: Circle) => {
    const R = c.r + self;
    const d1 = Math.hypot(x1 - c.x, z1 - c.z);
    if (d1 >= R) return false;
    return d1 < Math.hypot(x0 - c.x, z0 - c.z);
  };
  for (const c of staticColliders) if (test(c)) return true;
  for (const [k, c] of movers) if (k !== ignore && !k.startsWith(ignore ?? '\u0000') && test(c)) return true;
  return false;
}
