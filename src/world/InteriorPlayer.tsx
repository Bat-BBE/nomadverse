'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame, world } from '@/game/store';
import { keys, onPress } from '@/game/input';
import { audio } from '@/game/audio';
import { Human, type HumanHandle, type HumanPose } from './Human';
import { playMorinKhuur } from '@/game/audio';

// Walking around inside the ger: same character, WASD / joystick movement,
// a close third-person camera that stays inside the felt walls and under the
// roof, solid furniture, and E-interactions with things you stand next to.

const R = 3.6; // lattice wall radius (matches Interior)
const WALL = 1.6;
const TOP = 2.95;
const TOONO = 0.75;
export const DOOR_IN = { x: 0, z: 3.05 };

export const icam = { yaw: 0, pitch: 0.22, dist: 2.3, targetDist: 2.3 };

/** Solid furniture as circles / boxes on the floor plan (door = +z, south). */
function blocked(x: number, z: number) {
  if (Math.hypot(x, z) > R - 0.38) return true; // lattice wall
  if (Math.hypot(x, z + 0.12) < 0.72) return true; // stove + the two columns
  if (Math.abs(x) < 0.6 && Math.abs(z + 1.25) < 0.42) return true; // low table
  if (Math.abs(x) < 1.15 && z < -2.62) return true; // chests at the khoimor
  if (Math.abs(x) > 2.15 && z > -1.45 && z < 0.65) return true; // beds east/west
  if (Math.hypot(x - 2.3, z - 2.15) < 0.62) return true; // cupboard (east, kitchen side)
  if (Math.hypot(x + 2.55, z - 1.75) < 0.45) return true; // saddle (west)
  if (Math.hypot(x + 2.35, z + 2.15) < 0.3) return true; // morin khuur
  return false;
}

// Things you can do inside: each action has a body pose and a place/orientation.
export type ActionType = 'sit' | 'lieE' | 'lieW' | 'warm' | 'play';
interface ActionDef {
  pose: HumanPose;
  x: number;
  z: number;
  y: number; // root height (beds are raised)
  yaw: number;
  pitch: number; // -PI/2 = lying on the back
  enter?: () => void;
}
const ACTIONS: Record<ActionType, ActionDef> = {
  // cross-legged at the khoimor, facing the door across the table
  sit: { pose: 'sit', x: 0, z: -1.95, y: 0.02, yaw: 0, pitch: 0 },
  // on the beds, head to the north (pillow end), feet toward the door
  lieE: { pose: 'lie', x: 3.0 + Math.sin(0.15) * 0.92 - 0.05, z: -0.46 + Math.cos(0.15) * 0.92, y: 0.72, yaw: 0.15, pitch: -Math.PI / 2 },
  lieW: { pose: 'lie', x: -3.0 - Math.sin(0.15) * 0.92 + 0.05, z: -0.46 + Math.cos(0.15) * 0.92, y: 0.72, yaw: -0.15, pitch: -Math.PI / 2 },
  // hands held out to the stove
  warm: { pose: 'warm', x: 0.62, z: 0.6, y: 0.012, yaw: Math.atan2(-0.62, -0.72), pitch: 0 },
  // on a low stool by the west wall, facing the hearth
  play: { pose: 'play', x: -1.75, z: -1.45, y: 0.012, yaw: Math.atan2(1.75, 1.45), pitch: 0 },
};

interface Spot {
  x: number;
  z: number;
  r: number;
  label: () => string | null;
  use: () => void;
}

function useSpots(start: (a: ActionType) => void): Spot[] {
  return useMemo(() => {
    const g = () => useGame.getState();
    return [
      { x: DOOR_IN.x, z: DOOR_IN.z, r: 1.0, label: () => 'Гадагш гарах', use: () => (world.cutscene = { type: 'leave', t: 0 }) },
      { x: 0, z: 0.85, r: 0.9, label: () => 'Цай чанах', use: () => g().setModal({ type: 'tea' }) },
      {
        // цагаан идээний ширээ on the east (kitchen) side, by the cupboard
        x: 1.75,
        z: 1.35,
        r: 0.75,
        label: () => ((g().inventory.tarag ?? 0) > 0 ? 'Ааруул хийх' : 'Тараг бүрэх'),
        use: () => {
          world.activitySpot = { x: 1.75, z: 1.35, heading: Math.atan2(2.3 - 1.75, 2.15 - 1.35) };
          icam.yaw = world.activitySpot.heading + 1.0;
          icam.pitch = 0.3;
          world.lastDrag = performance.now();
          g().startActivity((g().inventory.tarag ?? 0) > 0 ? 'aaruul' : 'tarag');
        },
      },
      { x: 0.75, z: 0.55, r: 0.55, label: () => 'Гараа ээх', use: () => start('warm') },
      { x: 0, z: -2.0, r: 0.75, label: () => 'Хойморт суух', use: () => start('sit') },
      { x: 0, z: -2.45, r: 0.45, label: () => 'Авдар нээх', use: () => g().setModal({ type: 'chest' }) },
      { x: 1.85, z: -0.4, r: 0.8, label: () => 'Орон дээр хэвтэх', use: () => start('lieE') },
      { x: -1.85, z: -0.4, r: 0.8, label: () => 'Орон дээр хэвтэх', use: () => start('lieW') },
      { x: -1.9, z: -1.75, r: 0.6, label: () => 'Морин хуур тоглох', use: () => start('play') },
    ];
  }, [start]);
}

const roofY = (r: number) => (r < TOONO ? TOP : WALL + ((R - r) / (R - TOONO)) * (TOP - WALL));

export function InteriorPlayer() {
  const profile = useGame((st) => st.profile);
  const group = useRef<THREE.Group>(null);
  const human = useRef<HumanHandle>(null);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const action = useRef<ActionType | null>(null);
  const blend = useRef(0); // 0 standing where the player is, 1 settled in the action pose
  const khuur = useRef<THREE.Group>(null);
  const stool = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Group>(null);
  const bowRef = useRef<THREE.Group>(null);
  const start = useCallback((a: ActionType) => {
    action.current = a;
    vel.current.set(0, 0);
    // frame the activity from the front / side instead of from behind
    const def = ACTIONS[a];
    icam.yaw = def.yaw + (def.pose === 'lie' ? 1.35 : 0.55);
    icam.pitch = def.pose === 'lie' ? 0.45 : 0.22;
    icam.targetDist = def.pose === 'lie' ? 2.3 : 2.1;
    world.lastDrag = performance.now(); // hold this framing (no auto-follow)
    const s = useGame.getState();
    if (a === 'sit') {
      s.toast('Хойморт суулаа', s.tea.cups > 0 ? 'Халуун сүүтэй цайгаа шимэн ууж байна' : 'Хоймор — гэрийн хамгийн хүндтэй суудал');
      if (!s.steps['info.khoimor']) useGame.setState({ steps: { ...s.steps, 'info.khoimor': true } });
    }
    if (a === 'lieE' || a === 'lieW') s.toast('Амарч байна', 'Тооноор тэнгэр харагдана');
    if (a === 'warm') s.toast('Гараа ээж байна', 'Аргалын гал дулаахан');
    if (a === 'play') {
      s.toast('Морин хуур', 'Уртын дууны аялгуу эгшиглэж байна');
      playMorinKhuur(true);
    }
  }, []);
  const standUp = useCallback(() => {
    if (action.current === 'play') playMorinKhuur(false);
    action.current = null;
  }, []);
  const spots = useSpots(start);
  const current = useRef<Spot | null>(null);
  const vel = useRef(new THREE.Vector2());
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const left = useRef(false);
  const lastAct = useRef<ActionDef | null>(null);

  // arrive just inside the doorway, facing the khoimor, and take a step in
  useEffect(() => {
    const p = world.inside;
    p.x = DOOR_IN.x;
    p.z = DOOR_IN.z - 0.1;
    p.heading = Math.PI;
    p.speed = 0;
    world.cutscene = { type: 'arrive', t: 0 };
    icam.yaw = 0.35;
    icam.pitch = 0.22;
    icam.dist = icam.targetDist = 2.3;
    camera.position.set(p.x + 0.7, 1.9, p.z + 1.6);
    left.current = false;
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = 55;
    pc.updateProjectionMatrix();
    return () => {
      pc.fov = 50;
      pc.updateProjectionMatrix();
    };
  }, [camera]);

  // drag to look around, wheel to zoom (inside only)
  useEffect(() => {
    const el = gl.domElement;
    let active = false;
    let lx = 0;
    let ly = 0;
    let pid = -1;
    const down = (e: PointerEvent) => {
      if (useGame.getState().scene !== 'inside') return;
      active = true;
      pid = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!active || e.pointerId !== pid) return;
      icam.yaw -= (e.clientX - lx) * 0.006;
      icam.pitch = THREE.MathUtils.clamp(icam.pitch + (e.clientY - ly) * 0.004, -0.35, 1.0);
      lx = e.clientX;
      ly = e.clientY;
      world.lastDrag = performance.now();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pid) active = false;
    };
    const wheel = (e: WheelEvent) => {
      if (useGame.getState().scene !== 'inside') return;
      icam.targetDist = THREE.MathUtils.clamp(icam.targetDist + e.deltaY * 0.004, 1.1, 2.8);
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

  useEffect(
    () =>
      onPress((code) => {
        const s = useGame.getState();
        if (code !== 'KeyE' || s.scene !== 'inside' || s.modal || s.fading || world.cutscene) return;
        if (action.current) {
          standUp();
          return;
        }
        if (current.current) {
          audio.click();
          current.current.use();
        }
      }),
    []
  );

  useEffect(() => () => {
    useGame.getState().setPrompt(null);
    playMorinKhuur(false);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    if (s.scene !== 'inside') return;
    const p = world.inside;
    const cut = world.cutscene;
    let tx = 0;
    let tz = 0;

    if (cut) {
      // scripted steps: walking in from the door, or out through it
      cut.t += dt;
      const goal = cut.type === 'arrive' ? { x: 0, z: 2.25 } : { x: DOOR_IN.x, z: DOOR_IN.z + 0.5 };
      const dx = goal.x - p.x;
      const dz = goal.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        tx = (dx / d) * 1.6;
        tz = (dz / d) * 1.6;
      }
      if (cut.type === 'arrive' && (d < 0.1 || cut.t > 1.4)) world.cutscene = null;
      if (cut.type === 'leave' && (cut.t > 0.75 || d < 0.1) && !left.current) {
        left.current = true;
        s.goScene('outside');
      }
    } else if (!s.modal && !s.fading) {
      const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - world.input.y;
      const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + world.input.x;
      const len = Math.hypot(fwd, side);
      // moving gets you up again (once you have settled into the pose)
      if (action.current && len > 0.01 && blend.current > 0.95) standUp();
      if (action.current) {
        /* stay put */
      } else if (len > 0.01) {
        const f = Math.min(1, len) / len;
        const sp = keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.5; // small room: an unhurried pace
        tx = (-Math.sin(icam.yaw) * fwd + Math.cos(icam.yaw) * side) * f * sp;
        tz = (-Math.cos(icam.yaw) * fwd - Math.sin(icam.yaw) * side) * f * sp;
      }
    }
    vel.current.x += (tx - vel.current.x) * Math.min(1, dt * 9);
    vel.current.y += (tz - vel.current.y) * Math.min(1, dt * 9);
    const nx = p.x + vel.current.x * dt;
    const nz = p.z + vel.current.y * dt;
    const free = (x: number, z: number) => !blocked(x, z) || (cut?.type === 'leave' && Math.abs(x) < 0.5 && z > 2.6);
    if (free(nx, p.z)) p.x = nx;
    else vel.current.x *= 0.2;
    if (free(p.x, nz)) p.z = nz;
    else vel.current.y *= 0.2;
    p.speed = vel.current.length();
    if (p.speed > 0.15) {
      let d = Math.atan2(vel.current.x, vel.current.y) - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * Math.min(1, dt * 9);
    }
    // blend between walking and the chosen action's place / pose
    const act = action.current ? ACTIONS[action.current] : null;
    blend.current += ((act ? 1 : 0) - blend.current) * Math.min(1, dt * 4);
    if (act) lastAct.current = act;
    const A = lastAct.current;
    const b = blend.current;
    let rx = p.x;
    let ry = 0.012;
    let rz = p.z;
    let yaw = p.heading;
    let pitch = 0;
    if (A && b > 0.001) {
      rx = p.x + (A.x - p.x) * b;
      ry = 0.012 + (A.y - 0.012) * b;
      rz = p.z + (A.z - p.z) * b;
      let dy = A.yaw - p.heading;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw = p.heading + dy * b;
      // lie back only once over the bed
      pitch = A.pitch * Math.max(0, (b - 0.4) / 0.6);
    }
    if (group.current) {
      group.current.rotation.order = 'YXZ';
      group.current.position.set(rx, ry, rz);
      group.current.rotation.set(pitch, yaw, 0);
    }
    // a framework activity (dairy) pins you at its spot
    if (s.activity && world.activitySpot && group.current) {
      const sp = world.activitySpot;
      p.x += (sp.x - p.x) * Math.min(1, dt * 6);
      p.z += (sp.z - p.z) * Math.min(1, dt * 6);
      p.heading = sp.heading;
      group.current.position.set(p.x, 0.012, p.z);
      group.current.rotation.set(0, p.heading, 0);
    }
    if (world.cheer > 0 && !s.modal) world.cheer -= dt;
    if (human.current) {
      human.current.anim.speed = act ? 0 : p.speed;
      human.current.anim.riding = false;
      human.current.anim.pose = act && b > 0.25 ? act.pose : s.activity ? world.pose : world.cheer > 0 && !s.modal ? 'cheer' : 'stand';
      human.current.anim.sip = action.current === 'sit' && s.tea.cups > 0;
    }
    if (cupRef.current) cupRef.current.visible = action.current === 'sit' && s.tea.cups > 0 && b > 0.5;
    if (bowRef.current) bowRef.current.visible = action.current === 'play' && b > 0.5;
    const playing = action.current === 'play' && b > 0.3;
    if (khuur.current) {
      khuur.current.visible = playing;
      khuur.current.position.set(ACTIONS.play.x + Math.sin(ACTIONS.play.yaw) * 0.32, 0, ACTIONS.play.z + Math.cos(ACTIONS.play.yaw) * 0.32);
      khuur.current.rotation.set(0, ACTIONS.play.yaw, 0);
    }
    if (stool.current) stool.current.visible = playing;
    if (playing !== world.khuurInHand) world.khuurInHand = playing;

    // ---- close third-person camera, kept inside the walls and under the roof
    const idle = performance.now() - world.lastDrag > 1500;
    if (idle && p.speed > 0.6 && !cut) {
      let d = p.heading + Math.PI - icam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      icam.yaw += d * Math.min(1, dt * 1.2);
    }
    icam.dist += (icam.targetDist - icam.dist) * Math.min(1, dt * 4);
    // over-the-shoulder: look past the character's right shoulder so the room ahead stays visible
    const sh = 0.38 * Math.min(1, icam.dist / 1.6) * (1 - b * 0.6);
    const ty = 1.5 - b * (A && A.pose === 'lie' ? 0.75 : A && (A.pose === 'sit' || A.pose === 'play') ? 0.55 : 0);
    target.set(rx + Math.cos(icam.yaw) * sh, ty, rz - Math.sin(icam.yaw) * sh);
    camPos.set(
      target.x + Math.sin(icam.yaw) * Math.cos(icam.pitch) * icam.dist,
      target.y + Math.sin(icam.pitch) * icam.dist,
      target.z + Math.cos(icam.yaw) * Math.cos(icam.pitch) * icam.dist
    );
    const rr = Math.hypot(camPos.x, camPos.z);
    const maxR = R - 0.25;
    if (rr > maxR) {
      // slide in along the view line so the lattice never cuts the view
      const k = THREE.MathUtils.clamp((maxR - Math.hypot(p.x, p.z)) / Math.max(0.01, rr - Math.hypot(p.x, p.z)), 0.15, 1);
      camPos.lerpVectors(target, camPos, k);
    }
    camPos.y = THREE.MathUtils.clamp(camPos.y, 0.5, roofY(Math.hypot(camPos.x, camPos.z)) - 0.18);
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    camera.lookAt(target);

    // ---- nearest thing to use
    let best: Spot | null = null;
    let score = 1;
    if (!s.modal && !cut && !action.current) {
      for (const sp of spots) {
        const d = Math.hypot(sp.x - p.x, sp.z - p.z) / sp.r;
        if (d < score) {
          best = sp;
          score = d;
        }
      }
    }
    current.current = best;
    if (action.current) s.setPrompt('Босох');
    else s.setPrompt(best ? best.label() : null);
  });

  return (
    <>
      <group ref={group}>
        <Human
          ref={human}
          {...profile}
          rightHand={
            <>
              {/* white porcelain tea bowl with a blue rim */}
              <group ref={cupRef} position={[0, -0.03, 0.04]} rotation-x={-0.4} visible={false}>
                <mesh>
                  <cylinderGeometry args={[0.045, 0.028, 0.045, 14, 1, true]} />
                  <meshStandardMaterial color="#f3efe6" roughness={0.3} side={THREE.DoubleSide} />
                </mesh>
                <mesh position-y={0.015} rotation-x={-Math.PI / 2}>
                  <circleGeometry args={[0.04, 14]} />
                  <meshStandardMaterial color="#d6bf98" roughness={0.4} />
                </mesh>
                <mesh position-y={0.022} rotation-x={Math.PI / 2}>
                  <torusGeometry args={[0.045, 0.004, 4, 16]} />
                  <meshStandardMaterial color="#2e5e96" />
                </mesh>
              </group>
              {/* horsehair bow */}
              <group ref={bowRef} position={[0, -0.02, 0.02]} rotation={[0, 0, 1.35]} visible={false}>
                <mesh>
                  <cylinderGeometry args={[0.006, 0.006, 0.7, 5]} />
                  <meshStandardMaterial color="#6a4526" roughness={0.6} />
                </mesh>
                <mesh position={[0.02, 0, 0]}>
                  <boxGeometry args={[0.003, 0.66, 0.012]} />
                  <meshStandardMaterial color="#e8e0cc" roughness={0.9} />
                </mesh>
              </group>
            </>
          }
        />
      </group>
      {/* the morin khuur held upright between the knees */}
      <group ref={khuur} visible={false}>
        <group rotation-x={-0.18}>
          <mesh position-y={0.38}>
            <boxGeometry args={[0.26, 0.34, 0.09]} />
            <meshStandardMaterial color="#7a4a24" roughness={0.45} />
          </mesh>
          <mesh position-y={0.85}>
            <boxGeometry args={[0.035, 0.66, 0.035]} />
            <meshStandardMaterial color="#4e2c14" roughness={0.5} />
          </mesh>
          {/* carved horse head scroll */}
          <mesh position={[0, 1.25, 0.03]} rotation-x={0.6}>
            <boxGeometry args={[0.06, 0.15, 0.08]} />
            <meshStandardMaterial color="#2c1a0e" roughness={0.5} />
          </mesh>
          {[-0.012, 0.012].map((x) => (
            <mesh key={x} position={[x, 0.8, 0.05]}>
              <boxGeometry args={[0.003, 0.9, 0.003]} />
              <meshStandardMaterial color="#e6dcc4" />
            </mesh>
          ))}
        </group>
      </group>
      {/* low wooden stool */}
      <group ref={stool} position={[ACTIONS.play.x, 0, ACTIONS.play.z]} rotation-y={ACTIONS.play.yaw} visible={false}>
        <mesh position-y={0.36}>
          <boxGeometry args={[0.4, 0.05, 0.32]} />
          <meshStandardMaterial color="#b8461c" roughness={0.5} />
        </mesh>
        {[
          [0.16, 0.12],
          [-0.16, 0.12],
          [0.16, -0.12],
          [-0.16, -0.12],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.17, z]}>
            <boxGeometry args={[0.04, 0.34, 0.04]} />
            <meshStandardMaterial color="#8a3414" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </>
  );
}
