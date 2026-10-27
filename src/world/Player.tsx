'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, isInRiver, LOC, PLAY_RADIUS, riverDistance, slopePitch } from '@/game/terrain';
import { activeQuest, isDone, useGame, world } from '@/game/store';
import { keys, onPress } from '@/game/input';
import { audio } from '@/game/audio';
import { bodyCircles, setMover, stepBlocked } from '@/game/colliders';
import { env } from '@/game/tod';
import { HorseModel, type HorseHandle } from './Animals';
import { Human, type HumanHandle } from './Human';
import { FELT_AREA, NPC_SPOTS } from './Npc';
import { COWS, herd } from './Livestock';
import { NPCS, type NpcId } from '@/game/content';
import { softDot } from './Ger';

// ---------------------------------------------------------------- camera rig

// Sheep pen (хашаа) behind the ger: the fence is solid, the gate (east side) can be opened.
const PEN = { x: -15, z: -9, r: 5.5 };
const PEN_GATE = { x: PEN.x + PEN.r + 0.6, z: PEN.z };
function penBlocks(x: number, z: number, gateOpen: boolean) {
  const d = Math.hypot(x - PEN.x, z - PEN.z);
  if (Math.abs(d - PEN.r) > 0.35) return false;
  const a = Math.atan2(z - PEN.z, x - PEN.x);
  const inGap = Math.abs(a) < (Math.PI * 2) / 26 * 0.95;
  return !(inGap && gateOpen);
}

export const cam = { yaw: 5.2, pitch: 0.3, dist: 7, targetDist: 7 };
export const START = { x: 1.5, z: 7.5, heading: 2.06 };

const tmpTarget = new THREE.Vector3();
export function cameraPose(out: THREE.Vector3, yaw: number, pitch: number, dist: number, tx: number, ty: number, tz: number) {
  out.set(
    tx + Math.sin(yaw) * Math.cos(pitch) * dist,
    ty + Math.sin(pitch) * dist,
    tz + Math.cos(yaw) * Math.cos(pitch) * dist
  );
  const ground = heightAt(out.x, out.z) + 0.6;
  if (out.y < ground) out.y = ground;
  // keep the camera out of the ger: slide it around the felt wall
  const gr = Math.hypot(out.x, out.z);
  if (gr < 4.4 && out.y < 3.6) {
    const k = 4.4 / Math.max(gr, 0.01);
    out.x *= k;
    out.z *= k;
  }
  return out;
}

// ---------------------------------------------------------------- interactions

interface Interactable {
  id: string;
  r: number;
  pos: () => { x: number; z: number };
  label: () => string | null;
  use: () => void;
}

function useInteractables(): Interactable[] {
  return useMemo(() => {
    const g = () => useGame.getState();
    return [
      {
        id: 'door',
        r: 2.4,
        pos: () => LOC.door,
        label: () => (g().mounted ? null : 'Гэрт орох'),
        use: () => {
          g().setDoor(true);
          world.cutscene = { type: 'enter', t: 0 };
          g().complete('tea', 'enter');
          if (!g().steps['seen.door']) {
            useGame.setState({ steps: { ...g().steps, 'seen.door': true } });
            setTimeout(() => g().toast('Босго гишгэлгүй ор', 'Гэрт орохдоо босгон дээр гишгэдэггүй ёстой'), 900);
          }
        },
      },
      {
        id: 'horse',
        r: 2.6,
        pos: () => world.horse,
        label: () => (g().mounted ? null : 'Морь унах'),
        use: () => {
          g().setMounted(true);
          g().complete('ride', 'mount');
          audio.click();
        },
      },
      {
        id: 'ovoo',
        r: 5,
        pos: () => LOC.ovoo,
        label: () => {
          const s = g().steps;
          if (s['ovoo.circle'] && !s['ovoo.stone']) return 'Чулуу нэмэх';
          return 'Овооны тухай';
        },
        use: () => {
          const s = g().steps;
          if (s['ovoo.circle'] && !s['ovoo.stone']) g().complete('ovoo', 'stone');
          else g().setModal({ type: 'info', id: 'ovoo' });
        },
      },
      ...(Object.keys(NPCS) as NpcId[]).map((id) => ({
        id: `npc.${id}`,
        r: 2.4,
        pos: () => NPC_SPOTS[id],
        label: () => `${NPCS[id].name}тай ярилцах`,
        use: () => g().setModal({ type: 'npc', id }),
      })),
      {
        id: 'bucket',
        r: 1.6,
        pos: () => ({ x: 4.1, z: 3.6 }),
        label: () => ((g().inventory.bucket ?? 0) > 0 || (g().inventory.milk ?? 0) > 0 ? null : 'Хувин авах'),
        use: () => {
          g().addItems({ bucket: 1 });
          g().toast('Хувин авлаа', 'Үнээ саахад хэрэгтэй');
          if (g().steps['milk.talk']) g().complete('milk', 'bucket');
          audio.click();
        },
      },
      ...COWS.map((c, i) => ({
        id: `cow.${i}`,
        r: 2.6,
        pos: () => c,
        label: () => 'Үнээ саах',
        use: () => {
          // sit at the cow's right side, by the udder, facing it
          const sx = c.x - Math.sin(c.heading) * 0.36 - Math.cos(c.heading) * 0.72;
          const sz = c.z - Math.cos(c.heading) * 0.36 + Math.sin(c.heading) * 0.72;
          world.activitySpot = { x: sx, z: sz, heading: c.heading + Math.PI / 2 };
          g().startActivity('milking');
        },
      })),
      {
        id: 'shear',
        r: 2.2,
        pos: () => herd.find((m) => m.resident && !m.sheared) ?? { x: 9999, z: 9999 },
        label: () => 'Хонь хяргах',
        use: () => {
          const m = herd.find((h) => h.resident && !h.sheared);
          if (!m) return;
          world.activitySpot = { x: m.x + Math.sin(m.heading + Math.PI / 2) * 0.8, z: m.z + Math.cos(m.heading + Math.PI / 2) * 0.8, heading: m.heading - Math.PI / 2 };
          g().startActivity('shearing');
          shearTarget = g().activity?.id === 'shearing' ? m : null;
        },
      },
      {
        id: 'felt',
        r: 2.2,
        pos: () => FELT_AREA,
        label: () => 'Эсгий хийх',
        use: () => {
          world.activitySpot = { x: FELT_AREA.x + 0.9, z: FELT_AREA.z + 0.2, heading: -Math.PI / 2 - 0.4 };
          g().startActivity('felting');
        },
      },
      { id: 'dog', r: 2.4, pos: () => world.dog, label: () => 'Банхар нохой', use: () => g().setModal({ type: 'info', id: 'dog' }) },
      {
        id: 'gate',
        r: 2.2,
        pos: () => PEN_GATE,
        label: () => (g().gateOpen ? 'Хашааны хаалга хаах' : 'Хашааны хаалга нээх'),
        use: () => {
          g().toggleGate();
          audio.click();
          const st = g();
          if (st.gateOpen && st.steps['herd.talk']) st.complete('herd', 'gate');
          if (!st.gateOpen && st.steps['herd.drive']) st.complete('herd', 'close');
        },
      },
      { id: 'argal', r: 2, pos: () => LOC.argal, label: () => 'Аргал', use: () => g().setModal({ type: 'info', id: 'argal' }) },
      { id: 'pasture', r: 9, pos: () => LOC.pasture, label: () => 'Монгол адууны тухай', use: () => g().setModal({ type: 'info', id: 'horse' }) },
      { id: 'flock', r: 15, pos: () => LOC.farPasture, label: () => 'Таван хошуу мал', use: () => g().setModal({ type: 'info', id: 'herd' }) },
      { id: 'camels', r: 8, pos: () => LOC.camels, label: () => 'Таван хошуу мал', use: () => g().setModal({ type: 'info', id: 'herd' }) },
      {
        id: 'river',
        r: 12,
        pos: () => ({ x: world.player.x, z: world.player.z + (riverDistance(world.player.x, world.player.z) < 12 ? 0 : 999) }),
        label: () => 'Голын тухай',
        use: () => g().setModal({ type: 'info', id: 'river' }),
      },
    ];
  }, []);
}

let shearTarget: (typeof herd)[number] | null = null;
useGame.subscribe((st, prev) => {
  if (shearTarget && st.activitiesDone !== prev.activitiesDone && st.activity?.id === 'shearing') {
    shearTarget.sheared = true;
    shearTarget = null;
  }
});

// ---------------------------------------------------------------- objective marker

export function objectiveTarget(): { x: number; z: number } | null {
  const s = useGame.getState();
  const q = activeQuest(s.questsDone);
  if (!q) return null;
  const step = q.steps.find((st) => !isDone(s.steps, q.id, st.id));
  if (!step) return null;
  switch (`${q.id}.${step.id}`) {
    case 'morning.horses':
      return LOC.pasture;
    case 'morning.river':
      return LOC.riverBank;
    case 'tea.enter':
    case 'ger.toono':
    case 'ger.uni':
    case 'ger.khana':
    case 'ger.bagana':
    case 'ger.golomt':
      return LOC.door;
    case 'tea.brew':
    case 'tea.serve':
      return LOC.door;
    case 'ride.mount':
      return s.mounted ? null : world.horse;
    case 'ride.hill':
    case 'ovoo.circle':
    case 'ovoo.stone':
      return LOC.ovoo;
    case 'herd.talk':
      return NPC_SPOTS.batbayar;
    case 'herd.gate':
    case 'herd.close':
      return PEN_GATE;
    case 'herd.drive': {
      // the loose sheep that still need driving
      const loose = herd.filter((m) => !m.resident && !m.penned);
      if (!loose.length) return PEN_GATE;
      return { x: loose.reduce((a, m) => a + m.x, 0) / loose.length, z: loose.reduce((a, m) => a + m.z, 0) / loose.length };
    }
    case 'milk.talk':
      return NPC_SPOTS.tsetseg;
    case 'milk.bucket':
      return { x: 4.1, z: 3.6 };
    case 'milk.milk':
      return COWS[0];
    case 'dairy.tarag':
    case 'dairy.aaruul':
      return (s.inventory.milk ?? 0) > 0 || (s.inventory.tarag ?? 0) > 0 ? LOC.door : COWS[0];
    case 'felt.talk':
    case 'sew.talk':
    case 'sew.sew':
      return NPC_SPOTS.ganaa;
    case 'felt.shear':
      return PEN_GATE;
    case 'felt.felt':
      return FELT_AREA;
  }
  return null;
}

function ObjectiveMarker() {
  const g = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const beamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    []
  );
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const t = objectiveTarget();
    const d = t ? Math.hypot(t.x - world.player.x, t.z - world.player.z) : 0;
    grp.visible = !!t && d > 4;
    if (!t) return;
    grp.position.set(t.x, heightAt(t.x, t.z), t.z);
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.5);
    if (ring.current) ring.current.scale.setScalar(1 + pulse * 0.25);
    beamMat.opacity = 0.1 + pulse * 0.1 + (1 - env.dayness) * 0.1;
  });
  return (
    <group ref={g}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.15}>
        <ringGeometry args={[1.4, 1.6, 40]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <mesh position-y={6} material={beamMat}>
        <cylinderGeometry args={[0.35, 0.9, 12, 16, 1, true]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- hoof dust

/** Dust kicked up behind the hooves when trotting or galloping (pooled sprites). */
function Dust() {
  const N = 40;
  const parts = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        life: 0,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        mat: new THREE.SpriteMaterial({ map: softDot(), color: '#cbb48c', transparent: true, depthWrite: false, opacity: 0 }),
      })),
    []
  );
  const group = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const next = useRef(0);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const hs = world.horse;
    const sp = useGame.getState().mounted ? Math.abs(hs.speed) : 0;
    if (sp > 3.5) {
      acc.current += dt * sp * 1.6;
      while (acc.current > 1) {
        acc.current -= 1;
        const p = parts[next.current];
        next.current = (next.current + 1) % N;
        const back = 0.4 + Math.random() * 0.5;
        p.x = hs.x - Math.sin(hs.heading) * back + (Math.random() - 0.5) * 0.5;
        p.z = hs.z - Math.cos(hs.heading) * back + (Math.random() - 0.5) * 0.5;
        p.y = heightAt(p.x, p.z) + 0.1;
        p.vx = (Math.random() - 0.5) * 0.6 - Math.sin(hs.heading) * 0.8;
        p.vz = (Math.random() - 0.5) * 0.6 - Math.cos(hs.heading) * 0.8;
        p.life = 1;
      }
    }
    group.current?.children.forEach((c, i) => {
      const p = parts[i];
      if (p.life <= 0) {
        c.visible = false;
        return;
      }
      p.life -= dt * 0.8;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += dt * 0.35;
      c.visible = true;
      c.position.set(p.x, p.y, p.z);
      const s = 0.4 + (1 - p.life) * 1.6;
      c.scale.set(s, s * 0.7, 1);
      p.mat.opacity = Math.max(0, p.life) * 0.35;
    });
  });
  return (
    <group ref={group}>
      {parts.map((p, i) => (
        <sprite key={i} material={p.mat} visible={false} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- player controller

export function Player() {
  const profile = useGame((st) => st.profile);
  const group = useRef<THREE.Group>(null);
  const nomad = useRef<HumanHandle>(null);
  const horse = useRef<HorseHandle>(null);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const inter = useInteractables();
  const current = useRef<Interactable | null>(null);
  const vel = useRef(new THREE.Vector2());
  const lastAngle = useRef<number | null>(null);
  const circle = useRef(0);
  const warned = useRef(false);
  const camPos = useMemo(() => new THREE.Vector3(), []);

  // Mouse/touch drag to orbit, wheel to zoom
  useEffect(() => {
    const el = gl.domElement;
    let active = false;
    let lx = 0;
    let ly = 0;
    let pid = -1;
    const down = (e: PointerEvent) => {
      if (useGame.getState().scene !== 'outside' || useGame.getState().phase !== 'play') return;
      active = true;
      pid = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!active || e.pointerId !== pid) return;
      cam.yaw -= (e.clientX - lx) * 0.006;
      cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - ly) * 0.004, 0.05, 1.25);
      lx = e.clientX;
      ly = e.clientY;
      world.dragging = true;
      world.lastDrag = performance.now();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      active = false;
      world.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      if (useGame.getState().scene !== 'outside') return;
      cam.targetDist = THREE.MathUtils.clamp(cam.targetDist + e.deltaY * 0.01, 3.5, 20);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  // E to interact / dismount
  useEffect(
    () =>
      onPress((code) => {
        const s = useGame.getState();
        if (code !== 'KeyE' || s.phase !== 'play' || s.scene !== 'outside' || s.modal || s.fading) return;
        if (current.current) {
          current.current.use();
          return;
        }
        if (s.mounted && Math.abs(world.horse.speed) < 3) {
          s.setMounted(false);
          // step off on the horse's left side
          const h = world.horse.heading;
          world.player.x = world.horse.x + Math.cos(h) * 1.1;
          world.player.z = world.horse.z - Math.sin(h) * 1.1;
          world.horse.speed = 0;
          audio.click();
        }
      }),
    []
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const p = world.player;
    const hs = world.horse;
    const playing = s.phase === 'play' && s.scene === 'outside';
    const cut = playing ? world.cutscene : null;
    const frozen = !playing || !!s.modal || s.fading || !!cut || !!s.activity;

    // ---- input
    let fwd = 0;
    let side = 0;
    if (!frozen) {
      fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - world.input.y;
      side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + world.input.x;
    }
    const run = keys.ShiftLeft || keys.ShiftRight;

    // the doorway itself is passable while walking in or out
    const doorway = (x: number, z: number) => !!cut && Math.abs(x) < 0.55 && z > 2.9;
    // from where we stand now (the horse when riding)
    const fromX = s.mounted ? hs.x : p.x;
    const fromZ = s.mounted ? hs.z : p.z;
    const solid = (x: number, z: number) =>
      s.mounted
        ? stepBlocked(fromX, fromZ, x, z, 0.5, 'ride.') ||
          // the horse's head and chest too
          stepBlocked(fromX + Math.sin(hs.heading) * 0.8, fromZ + Math.cos(hs.heading) * 0.8, x + Math.sin(hs.heading) * 0.8, z + Math.cos(hs.heading) * 0.8, 0.3, 'ride.')
        : stepBlocked(fromX, fromZ, x, z, 0.3);
    const blocked = (x: number, z: number) =>
      solid(x, z) ||
      (Math.hypot(x, z) < 3.75 && !doorway(x, z)) || // ger
      Object.values(NPC_SPOTS).some((n) => Math.hypot(x - n.x, z - n.z) < 0.6) ||
      COWS.some((c) => Math.hypot(x - c.x, z - c.z) < 0.85) ||
      Math.hypot(x - 96, z - 8) < 3.9 || // neighbours
      Math.hypot(x + 52, z - 62) < 3.9 ||
      Math.hypot(x - LOC.ovoo.x, z - LOC.ovoo.z) < 2.0 ||
      Math.hypot(x, z) > PLAY_RADIUS ||
      isInRiver(x, z) ||
      penBlocks(x, z, useGame.getState().gateOpen);

    if (s.mounted) {
      // tank-style steering on horseback
      const target = fwd > 0 ? (run ? 15 : 6) : fwd < 0 ? -1.5 : 0;
      hs.speed += (target - hs.speed) * Math.min(1, dt * (target > hs.speed ? 1.6 : 2.5));
      const turn = side * (1.9 - Math.min(Math.abs(hs.speed), 15) * 0.05);
      hs.heading -= turn * dt * (Math.abs(hs.speed) > 0.3 || side ? 1 : 0);
      const nx = hs.x + Math.sin(hs.heading) * hs.speed * dt;
      const nz = hs.z + Math.cos(hs.heading) * hs.speed * dt;
      if (!blocked(nx, nz)) {
        hs.x = nx;
        hs.z = nz;
      } else hs.speed *= 0.3;
      p.x = hs.x;
      p.z = hs.z;
      p.heading = hs.heading;
      p.speed = Math.abs(hs.speed);
    } else {
      const len = Math.hypot(fwd, side);
      let tx = 0;
      let tz = 0;
      if (cut) {
        // scripted steps through the door (enter: into the doorway; exit: out onto the grass)
        cut.t += dt;
        const goal = cut.type === 'enter' ? { x: 0, z: 3.2 } : { x: 0.2, z: 6.0 };
        const dx = goal.x - p.x;
        const dz = goal.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          tx = (dx / d) * 1.7;
          tz = (dz / d) * 1.7;
        }
        if (cut.type === 'enter' && (d < 0.15 || cut.t > 1.6) && !s.fading && s.scene === 'outside') {
          world.cutscene = null;
          s.goScene('inside');
        }
        if (cut.type === 'exit' && (d < 0.15 || cut.t > 1.6)) world.cutscene = null;
      } else if (len > 0.01) {
        const f = Math.min(1, len) / len;
        // camera-relative directions
        const fx = -Math.sin(cam.yaw);
        const fz = -Math.cos(cam.yaw);
        const rx = Math.cos(cam.yaw);
        const rz = -Math.sin(cam.yaw);
        const sp = run ? 7.5 : 3.6;
        tx = (fx * fwd + rx * side) * f * sp;
        tz = (fz * fwd + rz * side) * f * sp;
      }
      vel.current.x += (tx - vel.current.x) * Math.min(1, dt * 10);
      vel.current.y += (tz - vel.current.y) * Math.min(1, dt * 10);
      const nx = p.x + vel.current.x * dt;
      const nz = p.z + vel.current.y * dt;
      if (!blocked(nx, p.z)) p.x = nx;
      if (!blocked(p.x, nz)) p.z = nz;
      p.speed = vel.current.length();
      if (p.speed > 0.3) {
        const want = Math.atan2(vel.current.x, vel.current.y);
        let d = want - p.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        p.heading += d * Math.min(1, dt * 10);
      }
      hs.speed = 0;
    }
    p.y = heightAt(p.x, p.z);

    // ---- place models
    const grp = group.current;
    if (grp) {
      if (s.mounted) grp.position.set(p.x, p.y + 0.5 + (p.speed > 8 ? Math.abs(Math.sin(world.time * 16)) * 0.1 : 0), p.z);
      else grp.position.set(p.x, p.y, p.z);
      grp.rotation.y = p.heading;
    }
    // an activity pins the player to its spot; afterwards a short celebration
    const inActivity = !!s.activity && s.scene === 'outside';
    if (inActivity && world.activitySpot) {
      const sp = world.activitySpot;
      p.x += (sp.x - p.x) * Math.min(1, dt * 6);
      p.z += (sp.z - p.z) * Math.min(1, dt * 6);
      let dh = sp.heading - p.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      p.heading += dh * Math.min(1, dt * 6);
      p.speed = 0;
      vel.current.set(0, 0);
      if (grp) {
        grp.position.set(p.x, heightAt(p.x, p.z), p.z);
        grp.rotation.y = p.heading;
      }
    }
    if (world.cheer > 0 && !s.modal) world.cheer -= dt;
    if (nomad.current) {
      nomad.current.anim.pose = s.mounted ? 'stand' : inActivity ? world.pose : world.cheer > 0 && !s.modal ? 'cheer' : 'stand';
      nomad.current.anim.speed = p.speed;
      nomad.current.anim.riding = s.mounted;
      nomad.current.anim.gallop = s.mounted ? Math.min(1, Math.max(0, (p.speed - 6) / 6)) : 0;
    }
    // the tethered / dismounted horse is solid while nobody rides it
    if (!s.mounted) bodyCircles(hs.x, hs.z, hs.heading, 0.5, 0.42, 2).forEach((c, k) => setMover(`ride.${k}`, c.x, c.z, c.r));
    else bodyCircles(9999, 9999, 0, 0, 0, 2).forEach((c, k) => setMover(`ride.${k}`, c.x, c.z, 0));
    const hg = horse.current?.group;
    if (hg && horse.current) {
      hg.position.set(hs.x, heightAt(hs.x, hs.z), hs.z);
      hg.rotation.y = hs.heading;
      hg.rotation.x += (-slopePitch(hs.x, hs.z, hs.heading) - hg.rotation.x) * Math.min(1, dt * 6);
      horse.current.anim.speed = Math.abs(hs.speed);
      horse.current.anim.graze = s.mounted ? 0 : 0.35 + 0.35 * Math.sin(world.time * 0.2);
    }
    audio.update(dt, env.dayness, s.mounted && playing ? Math.abs(hs.speed) : 0);

    if (!playing) return;

    // ---- camera follow
    const idle = performance.now() - world.lastDrag > 1500;
    if (idle && p.speed > 1 && (s.mounted || fwd > 0)) {
      let d = p.heading + Math.PI - cam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * (s.mounted ? 1.6 : 0.8));
    }
    // during an activity: a close three-quarter view from the front-side
    if (inActivity && performance.now() - world.lastDrag > 1500) {
      let d = p.heading + 0.9 - cam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 2.5);
      cam.pitch += (0.22 - cam.pitch) * Math.min(1, dt * 2.5);
    }
    const wantDist = inActivity ? 3.0 : cam.targetDist * (s.mounted ? 1.45 : 1);
    cam.dist += (wantDist - cam.dist) * Math.min(1, dt * 4);
    const ty = p.y + (s.mounted ? 2.4 : 1.55);
    cameraPose(camPos, cam.yaw, cam.pitch, cam.dist, p.x, ty, p.z);
    // terrain between the player and the camera (hills): pull the camera in
    tmpTarget.set(p.x, ty, p.z);
    for (const f of [0.3, 0.55, 0.8]) {
      const sx = tmpTarget.x + (camPos.x - tmpTarget.x) * f;
      const sz = tmpTarget.z + (camPos.z - tmpTarget.z) * f;
      const sy = tmpTarget.y + (camPos.y - tmpTarget.y) * f;
      if (heightAt(sx, sz) + 0.35 > sy) {
        camPos.lerpVectors(tmpTarget, camPos, f * 0.85);
        camPos.y = Math.max(camPos.y, heightAt(camPos.x, camPos.z) + 0.6);
        break;
      }
    }
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    camera.lookAt(tmpTarget);
    // a little extra field of view at a gallop for a sense of speed
    const pc = camera as THREE.PerspectiveCamera;
    const wantFov = 50 + (s.mounted ? Math.max(0, Math.min(1, (p.speed - 7) / 8)) * 7 : 0);
    if (Math.abs(pc.fov - wantFov) > 0.01) {
      pc.fov += (wantFov - pc.fov) * Math.min(1, dt * 2);
      pc.updateProjectionMatrix();
    }

    // ---- quest triggers
    const doorD = Math.hypot(p.x - LOC.door.x, p.z - LOC.door.z);
    if (doorD > 6) s.complete('morning', 'leave');
    if (Math.hypot(p.x - LOC.pasture.x, p.z - LOC.pasture.z) < 12) s.complete('morning', 'horses');
    if (riverDistance(p.x, p.z) < 13) s.complete('morning', 'river');
    const od = Math.hypot(p.x - LOC.ovoo.x, p.z - LOC.ovoo.z);
    if (od < 14) s.complete('ride', 'hill');

    // walking around the ovoo clockwise (нар зөв) when seen from above
    if (od > 1.8 && od < 13 && !s.steps['ovoo.circle']) {
      const ang = Math.atan2(p.z - LOC.ovoo.z, p.x - LOC.ovoo.x);
      if (lastAngle.current !== null) {
        let d = ang - lastAngle.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        circle.current = Math.max(-Math.PI, circle.current + d);
        if (circle.current < -Math.PI * 0.6 && !warned.current) {
          warned.current = true;
          s.toast('Нар зөв тойрно', 'Овоог нарны явцын дагуу — цагийн зүүний чиглэлээр тойрдог');
          circle.current = 0;
        }
        const laps = Math.max(0, Math.floor(circle.current / (Math.PI * 2)));
        if (laps !== s.circle) s.setCircle(laps);
        if (laps >= 3) s.complete('ovoo', 'circle');
      }
      lastAngle.current = ang;
    } else lastAngle.current = null;

    // ---- nearest interactable
    let best: Interactable | null = null;
    let bestScore = 1;
    if (!s.modal) {
      for (const it of inter) {
        if (s.mounted && it.id === 'horse') continue;
        const ip = it.pos();
        const d = Math.hypot(ip.x - p.x, ip.z - p.z) / it.r;
        if (d < bestScore && it.label()) {
          best = it;
          bestScore = d;
        }
      }
    }
    current.current = best;
    if (best) s.setPrompt(best.label());
    else if (s.mounted && Math.abs(hs.speed) < 3) s.setPrompt('Мориноос буух');
    else s.setPrompt(null);
  });

  return (
    <>
      <group ref={group}>
        <Human ref={nomad} {...profile} />
      </group>
      <HorseModel ref={horse} saddled coat="#6b4024" mane="#1e140e" seed={9} />
      <ObjectiveMarker />
      <Dust />
    </>
  );
}
