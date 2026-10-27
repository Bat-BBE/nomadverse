'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, LOC, riverDistance, slopePitch } from '@/game/terrain';
import { loft } from '@/game/geo';
import { bodyCircles, setMover } from '@/game/colliders';
import { world } from '@/game/store';
import { HorseModel, type HorseHandle } from './Animals';
import { Human, type HumanHandle } from './Human';

// Everyday life around the camp: the father riding herd with an уурга, and the
// family's банхар dog lying by the ger.

/** Аав: rides a slow loop around the sheep with an уурга (lasso pole) in hand. */
export function Herder() {
  const horse = useRef<HorseHandle>(null);
  const rider = useRef<THREE.Group>(null);
  const human = useRef<HumanHandle>(null);
  const st = useRef({ a: 0, pause: 0 });

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    // walk for a while, stop to watch the flock, walk on
    const cycle = (clock.elapsedTime % 40) / 40;
    const moving = cycle < 0.7;
    const speed = moving ? 1.7 : 0;
    const R = 17;
    s.a += (speed / R) * dt;
    const x = LOC.farPasture.x + Math.cos(s.a) * R;
    const z = LOC.farPasture.z + Math.sin(s.a) * R * 0.8;
    const heading = Math.atan2(-Math.sin(s.a), Math.cos(s.a) * 0.8); // tangent of the loop
    const y = heightAt(x, z);
    const hg = horse.current?.group;
    if (hg && horse.current) {
      hg.position.set(x, y, z);
      hg.rotation.y = heading;
      hg.rotation.x = -slopePitch(x, z, heading);
      horse.current.anim.speed = speed;
      horse.current.anim.graze = moving ? 0 : 0.8;
    }
    bodyCircles(x, z, heading, 0.5, 0.45, 2).forEach((c, k) => setMover(`herder.${k}`, c.x, c.z, c.r));
    if (rider.current) {
      rider.current.position.set(x, y + 0.5, z);
      rider.current.rotation.y = heading;
    }
    if (human.current) {
      human.current.anim.riding = true;
      human.current.anim.gallop = 0;
    }
  });

  return (
    <>
      <HorseModel ref={horse} saddled coat="#c9b48c" mane="#4a3a2a" seed={4} />
      <group ref={rider}>
        <Human ref={human} deel="#6b4a2f" sash="#2f5f9a" skin="#a8735a" seed={7} />
        {/* уурга: a long birch pole held upright in the right hand, loop of rope at the tip */}
        <group position={[-0.32, 1.1, 0.25]} rotation={[0.35, 0, -0.08]}>
          <mesh position-y={1.6}>
            <cylinderGeometry args={[0.018, 0.026, 4.2, 6]} />
            <meshStandardMaterial color="#b89a6a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.75, 0.08]} rotation-x={0.4}>
            <torusGeometry args={[0.16, 0.008, 4, 16]} />
            <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </>
  );
}

// ---------------------------------------------------------------- Банхар dog
// A big black herding dog with tan legs, chest and "four-eye" brow spots.
// Body, neck+head, legs and the curled plume tail are lofted surfaces; the tail
// grows out of the rump (its base is buried in the body), so it never detaches.
// Behaviour: lies by the ger, gets up to wander or follow the player around the
// camp, then goes home and lies down again.

const DOG_HOME = { x: -3.4, z: 4.6, heading: 0.9 };

let dogGeo: { body: THREE.BufferGeometry; head: THREE.BufferGeometry; legU: THREE.BufferGeometry; legL: THREE.BufferGeometry; tail: THREE.BufferGeometry; ear: THREE.BufferGeometry } | null = null;
function dogGeometry() {
  if (dogGeo) return dogGeo;
  const black = new THREE.Color('#17120f');
  const tan = new THREE.Color('#9a6430');
  // tan underside / chest fading up from the belly
  const bodyColor = (p: THREE.Vector3, _t: number, a: number, out: THREE.Color) => {
    const under = Math.max(0, -Math.sin(a));
    out.copy(black).lerp(tan, Math.max(0, under - 0.55) * 1.6 * (p.z > 0.05 ? 1 : 0.4));
  };
  const body = loft(
    [
      { p: [0, 0.58, -0.46], rx: 0.07, ryT: 0.07 },
      { p: [0, 0.6, -0.36], rx: 0.16, ryT: 0.15, ryB: 0.17 }, // rump
      { p: [0, 0.6, -0.1], rx: 0.17, ryT: 0.16, ryB: 0.16 }, // loin
      { p: [0, 0.62, 0.16], rx: 0.19, ryT: 0.19, ryB: 0.23 }, // deep chest
      { p: [0, 0.66, 0.3], rx: 0.16, ryT: 0.17, ryB: 0.21 },
      { p: [0, 0.68, 0.38], rx: 0.08, ryT: 0.08 },
    ],
    { radial: 18, steps: 6, color: bodyColor }
  );
  const headColor = (p: THREE.Vector3, t: number, a: number, out: THREE.Color) => {
    out.copy(black);
    // tan muzzle sides / throat
    if (t > 0.62 && Math.sin(a) < 0.3) out.lerp(tan, 0.75);
    if (t < 0.4 && Math.sin(a) < -0.4) out.lerp(tan, 0.5);
  };
  const head = loft(
    [
      { p: [0, -0.08, -0.06], rx: 0.13, ryT: 0.14 },
      { p: [0, 0.08, 0.06], rx: 0.11, ryT: 0.11, ryB: 0.12 }, // thick maned neck
      { p: [0, 0.2, 0.15], rx: 0.11, ryT: 0.1, ryB: 0.1 }, // broad skull
      { p: [0, 0.18, 0.26], rx: 0.08, ryT: 0.07, ryB: 0.075 }, // stop
      { p: [0, 0.15, 0.36], rx: 0.06, ryT: 0.05, ryB: 0.06 }, // muzzle
      { p: [0, 0.145, 0.41], rx: 0.035, ryT: 0.03 },
    ],
    { radial: 16, steps: 6, color: headColor, up: [0, 1, -0.2] }
  );
  const legColor = (lowerPart: boolean) => (_p: THREE.Vector3, t: number, _a: number, out: THREE.Color) =>
    out.copy(black).lerp(tan, lowerPart ? Math.min(1, 0.4 + t) : Math.max(0, t - 0.6) * 1.5);
  const legU = loft(
    [
      { p: [0, 0.1, 0], rx: 0.08, ryT: 0.09 },
      { p: [0, -0.1, 0], rx: 0.06, ryT: 0.065 },
      { p: [0, -0.26, 0], rx: 0.042, ryT: 0.045 },
    ],
    { radial: 10, steps: 4, up: [0, 0, 1], color: legColor(false), capStart: false }
  );
  const legL = loft(
    [
      { p: [0, 0.02, 0], rx: 0.04, ryT: 0.042 },
      { p: [0, -0.18, 0], rx: 0.032, ryT: 0.034 },
      { p: [0, -0.215, 0.025], rx: 0.04, ryT: 0.035 }, // paw
      { p: [0, -0.225, 0.06], rx: 0.035, ryT: 0.025 },
    ],
    { radial: 10, steps: 4, up: [0, 0, 1], color: legColor(true) }
  );
  // plume tail: base buried in the rump, rising and curling over the back
  const tail = loft(
    [
      { p: [0, -0.04, 0.08], rx: 0.05, ryT: 0.05 },
      { p: [0, 0.0, -0.04], rx: 0.055, ryT: 0.055 },
      { p: [0, 0.12, -0.14], rx: 0.08, ryT: 0.08 },
      { p: [0, 0.28, -0.14], rx: 0.085, ryT: 0.085 },
      { p: [0, 0.38, -0.04], rx: 0.065, ryT: 0.065 },
      { p: [0, 0.38, 0.06], rx: 0.03, ryT: 0.03 },
    ],
    { radial: 12, steps: 6, up: [1, 0, 0], color: (_p, t, _a, out) => out.copy(black).lerp(tan, t > 0.9 ? 0.3 : 0) }
  );
  const ear = new THREE.SphereGeometry(1, 8, 6);
  ear.scale(0.03, 0.075, 0.06);
  dogGeo = { body, head, legU, legL, tail, ear };
  return dogGeo;
}

type DogMode = 'lie' | 'rise' | 'walk' | 'follow' | 'home' | 'down';

export function Dog() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const lower = useRef<(THREE.Group | null)[]>([]);
  const geo = useMemo(dogGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  const tanMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a6430', roughness: 0.85 }), []);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1a0e', roughness: 0.15 }), []);
  const noseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0c0a09', roughness: 0.3 }), []);
  const st = useRef({
    mode: 'lie' as DogMode,
    x: DOG_HOME.x,
    z: DOG_HOME.z,
    heading: DOG_HOME.heading,
    speed: 0,
    lie: 1, // 1 lying, 0 standing
    timer: 6 + Math.random() * 6,
    tx: 0,
    tz: 0,
    phase: 0,
    wag: 0,
  });

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const t = clock.elapsedTime;
    const px = world.player.x;
    const pz = world.player.z;
    const toPlayer = Math.hypot(px - s.x, pz - s.z);
    const playerNearHome = Math.hypot(px - DOG_HOME.x, pz - DOG_HOME.z) < 22;
    s.timer -= dt;

    // ---- behaviour
    let want = 0; // desired speed
    switch (s.mode) {
      case 'lie':
        if (s.timer <= 0 || (toPlayer < 4 && Math.random() < dt * 0.25)) {
          s.mode = 'rise';
          s.timer = 0.9;
        }
        break;
      case 'rise':
        if (s.timer <= 0) {
          s.mode = playerNearHome && toPlayer < 14 ? 'follow' : 'walk';
          s.timer = 12 + Math.random() * 10;
          const a = Math.random() * Math.PI * 2;
          s.tx = DOG_HOME.x + Math.cos(a) * (4 + Math.random() * 5);
          s.tz = DOG_HOME.z + Math.sin(a) * (4 + Math.random() * 5);
        }
        break;
      case 'walk': {
        const d = Math.hypot(s.tx - s.x, s.tz - s.z);
        if (d < 0.5) {
          const a = Math.random() * Math.PI * 2;
          s.tx = DOG_HOME.x + Math.cos(a) * (3 + Math.random() * 6);
          s.tz = DOG_HOME.z + Math.sin(a) * (3 + Math.random() * 6);
        }
        want = 1.1;
        if (toPlayer < 6 && playerNearHome) s.mode = 'follow';
        if (s.timer <= 0) s.mode = 'home';
        break;
      }
      case 'follow':
        // trot after the player, keeping a couple of metres away
        s.tx = px - Math.sin(world.player.heading) * 2.2;
        s.tz = pz - Math.cos(world.player.heading) * 2.2;
        want = toPlayer > 6 ? 4 : toPlayer > 3 ? 1.6 : 0;
        // keeps following while the player is on the move nearby; loses interest when they idle
        if (toPlayer < 10 && world.player.speed > 0.5) s.timer = Math.max(s.timer, 6);
        if (!playerNearHome || s.timer <= 0) s.mode = 'home';
        break;
      case 'home': {
        s.tx = DOG_HOME.x;
        s.tz = DOG_HOME.z;
        want = 1.3;
        if (Math.hypot(s.tx - s.x, s.tz - s.z) < 0.4) {
          s.mode = 'down';
          s.timer = 1;
        }
        break;
      }
      case 'down':
        if (s.timer <= 0) {
          s.mode = 'lie';
          s.timer = 15 + Math.random() * 15;
        }
        break;
    }
    const standing = s.mode === 'walk' || s.mode === 'follow' || s.mode === 'home' || s.mode === 'rise';
    s.lie += ((standing ? 0 : 1) - s.lie) * Math.min(1, dt * 2.2);

    // ---- locomotion (only once mostly up)
    s.speed += ((s.lie < 0.2 ? want : 0) - s.speed) * Math.min(1, dt * 3);
    const dx = s.tx - s.x;
    const dz = s.tz - s.z;
    const d = Math.hypot(dx, dz);
    if (s.speed > 0.05 && d > 0.05) {
      let diff = Math.atan2(dx, dz) - s.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.heading += diff * Math.min(1, dt * 4);
      const nx = s.x + Math.sin(s.heading) * s.speed * dt;
      const nz = s.z + Math.cos(s.heading) * s.speed * dt;
      // stay out of the ger and the river
      if (Math.hypot(nx, nz) > 3.9 && riverDistance(nx, nz) > 7) {
        s.x = nx;
        s.z = nz;
      }
    } else if (s.mode === 'down' || s.mode === 'lie') {
      let diff = DOG_HOME.heading - s.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.heading += diff * Math.min(1, dt * 2);
    }
    setMover('dog', s.x, s.z, s.lie > 0.5 ? 0.45 : 0.35);
    world.dog.x = s.x;
    world.dog.z = s.z;

    // ---- pose & animation
    const g = root.current;
    if (g) {
      g.position.set(s.x, heightAt(s.x, s.z), s.z);
      g.rotation.y = s.heading;
    }
    const trot = s.speed > 2.2;
    s.phase += dt * (trot ? 11 : 2 + s.speed * 4.5) * (s.speed > 0.1 ? 1 : 0);
    const amp = Math.min(1, s.speed / 1.2) * (trot ? 0.75 : 0.5) * (1 - s.lie);
    const L = s.lie;
    if (body.current) {
      body.current.position.y = -0.36 * L + Math.abs(Math.sin(s.phase)) * 0.02 * amp + Math.sin(t * 1.6) * 0.004;
    }
    const k = Math.min(1, dt * 10);
    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const front = i < 2;
      // walk: diagonal pairs (0&3, 1&2)
      const ph = s.phase + (i === 0 || i === 3 ? 0 : Math.PI);
      const swing = Math.sin(ph) * amp;
      const lieUpper = front ? -1.45 : -1.15; // front legs stretched forward, hind legs tucked
      const lieLower = front ? 0.1 : 2.3;
      const upper = swing * (1 - L) + lieUpper * L;
      const lowerBend = (Math.max(0, Math.cos(ph)) * 0.8 * amp * (front ? 1 : -0.7)) * (1 - L) + lieLower * L;
      leg.rotation.x += (upper - leg.rotation.x) * k;
      const lo = lower.current[i];
      if (lo) lo.rotation.x += (lowerBend - lo.rotation.x) * k;
    });
    // head: watches the player when near, rests on the paws when lying alone
    const near = toPlayer < 7;
    s.wag += ((near || s.speed > 0.3 ? 1 : 0.15) - s.wag) * Math.min(1, dt * 2);
    if (head.current) {
      const look = THREE.MathUtils.clamp(Math.atan2(px - s.x, pz - s.z) - s.heading, -1, 1);
      let rel = Math.atan2(Math.sin(look), Math.cos(look));
      if (!near) rel = Math.sin(t * 0.25) * 0.25;
      head.current.rotation.y += (rel * (s.speed > 0.3 ? 0.3 : 1) - head.current.rotation.y) * Math.min(1, dt * 3);
      const rest = L * (near ? 0.15 : 0.55);
      head.current.rotation.x += (rest - 0.05 + Math.sin(s.phase * 2) * 0.03 * amp - head.current.rotation.x) * Math.min(1, dt * 3);
    }
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * (near ? 13 : 5)) * 0.45 * s.wag;
      tail.current.rotation.x = 0.1 - L * 0.5;
    }
  });

  const legPos: [number, number][] = [
    [0.1, 0.22],
    [-0.1, 0.22],
    [0.1, -0.3],
    [-0.1, -0.3],
  ];

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={geo.body} material={mat} castShadow receiveShadow />
        {/* tail pivot sits on the rump; its loft starts inside the body */}
        <group ref={tail} position={[0, 0.63, -0.4]}>
          <mesh geometry={geo.tail} material={mat} castShadow />
        </group>
        <group ref={head} position={[0, 0.72, 0.3]}>
          <mesh geometry={geo.head} material={mat} castShadow />
          <mesh position={[0, 0.15, 0.415]} material={noseMat}>
            <sphereGeometry args={[0.028, 10, 8]} />
          </mesh>
          {[1, -1].map((sd) => (
            <group key={sd}>
              {/* the tan "second eyes" above the eyes */}
              <mesh position={[sd * 0.05, 0.27, 0.21]} material={tanMat}>
                <sphereGeometry args={[0.017, 8, 6]} />
              </mesh>
              <mesh position={[sd * 0.055, 0.225, 0.235]} material={eyeMat}>
                <sphereGeometry args={[0.014, 8, 6]} />
              </mesh>
              {/* floppy ears hanging at the sides of the skull */}
              <mesh position={[sd * 0.105, 0.21, 0.12]} rotation={[0.25, 0, sd * 0.35]} geometry={geo.ear} material={mat} />
            </group>
          ))}
        </group>
        {legPos.map(([x, z], i) => (
          <group key={i} ref={(el) => { legs.current[i] = el; }} position={[x, 0.48, z]}>
            <mesh geometry={geo.legU} material={mat} castShadow />
            <group ref={(el) => { lower.current[i] = el; }} position-y={-0.26}>
              <mesh geometry={geo.legL} material={mat} castShadow />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Бүргэд
// A golden eagle soaring in wide circles over the valley: long glides on
// slightly raised wings, an occasional few deep wingbeats, and a gentle bank
// into the turn.

let eagleGeo: { body: THREE.BufferGeometry; wing: THREE.BufferGeometry; tail: THREE.BufferGeometry } | null = null;
function eagleGeometry() {
  if (eagleGeo) return eagleGeo;
  const dark = new THREE.Color('#3a2a1e');
  const gold = new THREE.Color('#9a7442');
  const body = loft(
    [
      { p: [0, 0, -0.42], rx: 0.03, ryT: 0.03 },
      { p: [0, 0, -0.25], rx: 0.09, ryT: 0.08 },
      { p: [0, 0.01, 0.05], rx: 0.13, ryT: 0.12 },
      { p: [0, 0.03, 0.3], rx: 0.08, ryT: 0.08 }, // golden nape
      { p: [0, 0.03, 0.42], rx: 0.06, ryT: 0.06 },
      { p: [0, 0.0, 0.52], rx: 0.02, ryT: 0.025 }, // hooked beak
    ],
    { radial: 12, steps: 4, color: (p, _t, _a, out) => out.copy(dark).lerp(gold, Math.max(0, (p.z - 0.2) * 3)).lerp(new THREE.Color('#d8b04a'), p.z > 0.47 ? 1 : 0) }
  );
  // a broad wing with "fingered" primaries at the tip (span ~1.1 m per side)
  const s = new THREE.Shape();
  s.moveTo(0, 0.18);
  s.bezierCurveTo(0.35, 0.2, 0.7, 0.16, 0.95, 0.08);
  for (let i = 0; i < 5; i++) {
    const z = 0.08 - i * 0.07;
    s.lineTo(1.12 - i * 0.025, z - 0.01);
    s.lineTo(0.98 - i * 0.02, z - 0.04);
  }
  s.bezierCurveTo(0.7, -0.26, 0.35, -0.24, 0, -0.16);
  s.lineTo(0, 0.18);
  const wing = new THREE.ShapeGeometry(s, 8);
  wing.rotateX(-Math.PI / 2); // lie in the XZ plane, leading edge toward +z
  const tail = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(-0.06, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.14, -0.3), new THREE.Vector2(-0.14, -0.3)]),
    1
  );
  tail.rotateX(-Math.PI / 2);
  eagleGeo = { body, wing, tail };
  return eagleGeo;
}

export function Eagle() {
  const root = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const geo = useMemo(eagleGeometry, []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d2c1f', roughness: 0.9, side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    // a slowly drifting circle, low enough to read in the opening shot
    const a = t * 0.11;
    const R = 34 + Math.sin(t * 0.05) * 8;
    const cx = 6 + Math.sin(t * 0.02) * 10;
    const cz = -10;
    g.position.set(cx + Math.cos(a) * R, 26 + Math.sin(t * 0.17) * 4, cz + Math.sin(a) * R);
    // fly along the tangent, banked into the turn
    g.rotation.set(0, -a - Math.PI / 2, 0);
    g.rotateX(0.3); // bank into the turn
    // bursts of deep wingbeats, otherwise a dihedral glide with tiny adjustments
    const burst = Math.max(0, Math.sin(t * 0.32)) > 0.93 ? 1 : 0;
    const flap = burst ? Math.sin(t * 9) * 0.6 : 0.12 + Math.sin(t * 1.3) * 0.04;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={root}>
      {/* modelled facing +z, then turned so +x is the flight direction */}
      <group rotation-y={Math.PI / 2} scale={1.6}>
        <mesh geometry={geo.body} material={bodyMat} castShadow />
        <group ref={wingL} position={[0.08, 0.02, 0.05]}>
          <mesh geometry={geo.wing} material={wingMat} castShadow />
        </group>
        <group ref={wingR} position={[-0.08, 0.02, 0.05]} scale={[-1, 1, 1]}>
          <mesh geometry={geo.wing} material={wingMat} castShadow />
        </group>
        <mesh geometry={geo.tail} material={wingMat} position={[0, 0, -0.38]} />
      </group>
    </group>
  );
}
