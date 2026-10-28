'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, slopePitch } from '@/game/terrain';
import { useGame, world } from '@/game/store';
import { addStatic, bodyCircles, setMover } from '@/game/colliders';
import { audio } from '@/game/audio';
import {
  abandonRace,
  courseDistance,
  courseHeading,
  coursePoint,
  COURSE_LEN,
  GATE_HALF,
  gatePoint,
  GATES,
  JUDGE_SPOT,
  LAPS,
  playerProgress,
  race,
  RACE_CENTER,
  RACERS,
  START,
  START_HEADING,
} from '@/game/race';
import { HorseModel, type HorseHandle } from './Animals';
import { Human, type HumanHandle } from './Human';

// Наадмын талбай: the start/finish arch with its banner and prayer-flag
// pennants, flagged gates around the course, the officials' tent, and three
// child jockeys who line up and race you over two laps.

const COUNTDOWN = 3.2; // seconds of "3, 2, 1" before the riders go
const v = new THREE.Vector3();

/** Lateral offset of a gate post: ±GATE_HALF across the course. */
function gatePost(k: number, side: -1 | 1) {
  return coursePoint(k / GATES, side * GATE_HALF, new THREE.Vector3());
}

// ---------------------------------------------------------------- props

function bannerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d4a8c';
  g.fillRect(0, 0, c.width, c.height);
  // gold border with a running key (алхан хээ) band
  g.strokeStyle = '#e2b24c';
  g.lineWidth = 8;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.lineWidth = 4;
  for (let x = 30; x < c.width - 40; x += 40) {
    g.beginPath();
    g.moveTo(x, 34);
    g.lineTo(x + 20, 34);
    g.lineTo(x + 20, 24);
    g.lineTo(x + 30, 24);
    g.lineTo(x + 30, 34);
    g.lineTo(x + 40, 34);
    g.stroke();
    g.beginPath();
    g.moveTo(x, c.height - 34);
    g.lineTo(x + 20, c.height - 34);
    g.lineTo(x + 20, c.height - 24);
    g.lineTo(x + 30, c.height - 24);
    g.lineTo(x + 30, c.height - 34);
    g.lineTo(x + 40, c.height - 34);
    g.stroke();
  }
  g.fillStyle = '#f3d27a';
  g.font = 'bold 84px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('НААДАМ', c.width / 2, c.height / 2 + 4);
  // соёмбо-like sun and moon discs at each side
  for (const x of [120, c.width - 120]) {
    g.beginPath();
    g.arc(x, c.height / 2 - 14, 18, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x, c.height / 2 + 26, 22, 0, Math.PI);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A string of small triangular pennants in the five colours, sagging between two points. */
function pennantGeometry(a: THREE.Vector3, b: THREE.Vector3, n: number, sag: number) {
  const COLORS = ['#2a5fb0', '#f4f1e8', '#c23a26', '#2f7d4f', '#e6b33a'].map((c) => new THREE.Color(c));
  const pos: number[] = [];
  const col: number[] = [];
  for (let i = 0; i < n; i++) {
    const u0 = (i + 0.15) / n;
    const u1 = (i + 0.85) / n;
    const at = (u: number) => new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0));
    const p0 = at(u0);
    const p1 = at(u1);
    const tip = at((u0 + u1) / 2).add(new THREE.Vector3(0, -0.42, 0));
    pos.push(...p0.toArray(), ...tip.toArray(), ...p1.toArray());
    const c = COLORS[i % COLORS.length];
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function StartArch() {
  const tex = useMemo(bannerTexture, []);
  const y = heightAt(START.x, START.z);
  const pennants = useMemo(() => {
    const H = 4.6;
    return [
      pennantGeometry(new THREE.Vector3(-GATE_HALF - 0.4, H + 0.6, 0), new THREE.Vector3(-GATE_HALF - 9, 1.6, -2.5), 14, 0.6),
      pennantGeometry(new THREE.Vector3(GATE_HALF + 0.4, H + 0.6, 0), new THREE.Vector3(GATE_HALF + 9, 1.6, -2.5), 14, 0.6),
    ];
  }, []);
  const banner = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // the banner breathes in the wind
    if (banner.current) banner.current.rotation.x = Math.sin(clock.elapsedTime * 1.3) * 0.05;
  });
  // the arch spans the course: its local x runs across, local z along
  return (
    <group position={[START.x, y, START.z]} rotation-y={START_HEADING}>
      <group>
        {[-1, 1].map((side) => (
          <group key={side} position-x={side * (GATE_HALF + 0.4)}>
            <mesh position-y={2.6} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 5.2, 10]} />
              <meshStandardMaterial color="#8a2f20" roughness={0.6} />
            </mesh>
            {/* gilded finial */}
            <mesh position-y={5.35}>
              <sphereGeometry args={[0.2, 14, 10]} />
              <meshStandardMaterial color="#d9a641" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position-y={5.7}>
              <coneGeometry args={[0.1, 0.5, 10]} />
              <meshStandardMaterial color="#d9a641" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* stone footing */}
            <mesh position-y={0.15}>
              <cylinderGeometry args={[0.35, 0.42, 0.3, 10]} />
              <meshStandardMaterial color="#8b8478" roughness={0.95} />
            </mesh>
          </group>
        ))}
        {/* crossbar and the blue banner */}
        <mesh position-y={4.75} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.08, 0.08, GATE_HALF * 2 + 0.8, 8]} />
          <meshStandardMaterial color="#8a2f20" roughness={0.6} />
        </mesh>
        <group position-y={4.7}>
          {/* printed on both faces, so it reads correctly from either side */}
          <group ref={banner}>
            {[0, Math.PI].map((r) => (
              <mesh key={r} position-y={-0.62} rotation-y={r}>
                <planeGeometry args={[GATE_HALF * 1.6, 1.15]} />
                <meshStandardMaterial map={tex} roughness={0.85} />
              </mesh>
            ))}
          </group>
        </group>
        {pennants.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        ))}
        {/* the finish line chalked on the grass */}
        <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[GATE_HALF * 2, 0.35]} />
          <meshStandardMaterial color="#f2eee2" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}

/** The officials' white tent (майхан) with a blue trim, beside the finish. */
function Tent() {
  const p = useMemo(() => coursePoint(0.03, -GATE_HALF - 9), []);
  const y = heightAt(p.x, p.z);
  return (
    // the door faces the course
    <group position={[p.x, y, p.z]} rotation-y={START_HEADING - Math.PI / 2}>
      <mesh position-y={0.8} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.7, 1.6, 20, 1, true]} />
        <meshStandardMaterial color="#f1ece0" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={2.25} castShadow>
        <coneGeometry args={[1.95, 1.3, 20]} />
        <meshStandardMaterial color="#f4efe4" roughness={0.95} />
      </mesh>
      <mesh position-y={1.62}>
        <cylinderGeometry args={[1.96, 1.96, 0.14, 20, 1, true]} />
        <meshStandardMaterial color="#2a5fb0" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* open front flap */}
      <mesh position={[0, 0.75, 1.71]}>
        <planeGeometry args={[0.9, 1.5]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} />
      </mesh>
      <mesh position-y={3.2}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
        <meshStandardMaterial color="#8a6440" />
      </mesh>
      <mesh position={[0.22, 3.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.45, 0.28]} />
        <meshStandardMaterial color="#c23a26" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Flagged posts at every gate; the next gate to ride through turns gold. */
function Gates() {
  const posts = useRef<THREE.InstancedMesh>(null);
  const flags = useRef<THREE.InstancedMesh>(null);
  const N = (GATES - 1) * 2; // gate 0 is the arch
  const spots = useMemo(
    () =>
      Array.from({ length: GATES - 1 }, (_, i) => i + 1).flatMap((k) =>
        ([-1, 1] as const).map((side) => {
          const p = gatePost(k, side);
          return { k, x: p.x, z: p.z, y: heightAt(p.x, p.z), heading: courseHeading(k / GATES) };
        })
      ),
    []
  );
  const flagGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, -0.25, 0, 0, -0.55, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const blue = useMemo(() => new THREE.Color('#2a5fb0'), []);
  const red = useMemo(() => new THREE.Color('#c23a26'), []);
  const gold = useMemo(() => new THREE.Color('#ffc94a'), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const live = race.state === 'run' || race.state === 'count';
    const next = live ? ((race.gate + 1) % GATES) : -1;
    spots.forEach((s, i) => {
      if (posts.current) {
        m.compose(v.set(s.x, s.y + 1.4, s.z), q.identity(), one);
        posts.current.setMatrixAt(i, m);
      }
      if (flags.current) {
        // flutter around the pole, streaming roughly downwind
        q.setFromAxisAngle(v.set(0, 1, 0), 2.4 + Math.sin(t * 3.1 + i) * 0.35);
        m.compose(v.set(s.x, s.y + 2.75, s.z), q, one);
        flags.current.setMatrixAt(i, m);
        flags.current.setColorAt(i, s.k === next ? gold : i % 2 ? red : blue);
      }
    });
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true;
    if (flags.current) {
      flags.current.instanceMatrix.needsUpdate = true;
      if (flags.current.instanceColor) flags.current.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={posts} args={[undefined, undefined, N]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.06, 0.08, 2.8, 8]} />
        <meshStandardMaterial color="#efe8d8" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={flags} args={[flagGeo, undefined, N]} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.8} />
      </instancedMesh>
    </>
  );
}

// ---------------------------------------------------------------- riders

function AiRider({ i }: { i: number }) {
  const def = RACERS[i];
  const horse = useRef<HorseHandle>(null);
  const rider = useRef<THREE.Group>(null);
  const human = useRef<HumanHandle>(null);
  useFrame(({ clock }) => {
    const a = race.ai[i];
    const running = race.state === 'run' || race.state === 'done';
    const lane = a.lane + (running && a.done < 0 ? Math.sin(race.time * 0.35 + i * 1.7) * 0.9 : 0);
    const s = running || race.state === 'count' ? a.s : -0.022;
    coursePoint(s, lane, v);
    const heading = courseHeading(s);
    const y = heightAt(v.x, v.z);
    const hg = horse.current?.group;
    if (hg && horse.current) {
      hg.position.set(v.x, y, v.z);
      hg.rotation.y = heading;
      hg.rotation.x = -slopePitch(v.x, v.z, heading);
      horse.current.anim.speed = a.v;
      horse.current.anim.graze = race.state === 'idle' ? 0.25 + 0.25 * Math.sin(clock.elapsedTime * 0.3 + i) : 0;
    }
    // parked riders are solid; at a gallop they pass through rather than snag
    bodyCircles(v.x, v.z, heading, 0.5, 0.42, 2).forEach((c, k) => setMover(`racer.${i}.${k}`, c.x, c.z, a.v > 1 ? 0 : c.r));
    if (rider.current) {
      const bounce = a.v > 8 ? Math.abs(Math.sin(clock.elapsedTime * 15 + i)) * 0.09 : 0;
      rider.current.position.set(v.x, y + 0.5 + bounce, v.z);
      rider.current.rotation.y = heading;
    }
    if (human.current) {
      human.current.anim.riding = true;
      human.current.anim.gallop = Math.min(1, Math.max(0, (a.v - 6) / 6));
    }
  });
  return (
    <>
      <HorseModel ref={horse} saddled coat={def.coat} mane={def.mane} seed={def.seed} />
      {/* child jockeys, as at a real Naadam */}
      <group ref={rider}>
        <group scale={0.8}>
          <Human
            ref={human}
            deel={def.deel}
            sash={def.sash}
            skin="#b07a5c"
            woman={'woman' in def ? def.woman : false}
            hatStyle="malgai"
            headColor={def.sash}
            seed={def.seed}
          />
        </group>
      </group>
    </>
  );
}

function Officials() {
  const y = heightAt(JUDGE_SPOT.x, JUDGE_SPOT.z);
  return (
    // they stand off the left of the line, facing the riders
    <group position={[JUDGE_SPOT.x, y, JUDGE_SPOT.z]} rotation-y={START_HEADING - Math.PI / 2}>
      <group position-x={-0.6}>
        <Human deel="#5a3a24" sash="#e2b24c" skin="#a36f55" hatStyle="toortsog" headColor="#2a5fb0" seed={61} />
      </group>
      <group position-x={0.6} rotation-y={-0.4}>
        <Human deel="#9e2a3c" sash="#f0d08c" skin="#b98466" woman hatStyle="scarf" hair="twobraids" seed={73} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- race logic

let registered = false;
function registerSolids() {
  if (registered) return;
  registered = true;
  const posts = Array.from({ length: GATES }, (_, k) => k).flatMap((k) =>
    ([-1, 1] as const).map((side) => {
      const p = coursePoint(k / GATES, side * (k === 0 ? GATE_HALF + 0.4 : GATE_HALF), new THREE.Vector3());
      return { x: p.x, z: p.z, r: k === 0 ? 0.3 : 0.15 };
    })
  );
  const tent = coursePoint(0.03, -GATE_HALF - 9);
  addStatic([...posts, { x: tent.x, z: tent.z, r: 1.85 }, { x: JUDGE_SPOT.x, z: JUDGE_SPOT.z, r: 1.0 }]);
}

export function Naadam() {
  registerSolids();
  const root = useRef<THREE.Group>(null);
  const riders = useRef<THREE.Group>(null);
  const lastBeep = useRef(-1);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const p = world.player;
    const far = Math.hypot(p.x - RACE_CENTER.x, p.z - RACE_CENTER.z);
    if (root.current) root.current.visible = s.scene === 'outside' && far < 230;
    if (riders.current) riders.current.visible = race.state !== 'idle' || far < 150;
    if (s.phase !== 'play') return;

    // ---- countdown: 3, 2, 1, go
    if (race.state === 'count') {
      race.t += dt;
      const n = Math.floor(race.t);
      if (n !== lastBeep.current && race.t < COUNTDOWN) {
        lastBeep.current = n;
        audio.tick();
      }
      if (race.t >= COUNTDOWN) {
        race.state = 'run';
        race.time = 0;
        lastBeep.current = -1;
        audio.success();
      }
      return;
    }
    if (race.state === 'idle') return;

    // ---- the other riders
    const me = playerProgress(p.x, p.z);
    race.ai.forEach((a, i) => {
      let want: number;
      if (a.done >= 0) want = 0;
      else {
        const def = RACERS[i];
        const gap = a.s * GATES - me; // ahead (+) or behind (-) in gates
        // each horse has its own pace, a little surge and fade, and keeps the race close
        want = def.base + Math.sin(race.time * 0.6 + i * 2.1) * 0.6 - THREE.MathUtils.clamp(gap * 0.5, -1.0, 1.4);
        if (race.time < 1.2) want *= 0.7; // the jump from the line
      }
      a.v += (want - a.v) * Math.min(1, dt * (want < a.v ? 0.9 : 1.4));
      a.s += (a.v / COURSE_LEN) * dt;
      if (a.done < 0 && a.s >= LAPS) a.done = race.time;
    });
    if (race.state === 'done') {
      // the riders walk on past the line; tidy up once you have ridden away
      if (Math.hypot(p.x - START.x, p.z - START.z) > 70 && race.ai.every((a) => a.v < 0.5)) race.state = 'idle';
      return;
    }

    // ---- you
    race.time += dt;
    if (!s.mounted) return abandonRace('Мориноосоо буусан тул уралдаан зогслоо');
    if (courseDistance(p.x, p.z) > 40) return abandonRace('Уралдааны замаас хэт холдлоо');
    if (race.time > 180) return abandonRace('Хугацаа дууслаа');
    const next = gatePoint(race.gate + 1);
    if (Math.hypot(next.x - p.x, next.z - p.z) < GATE_HALF + 2.5) {
      race.gate += 1;
      audio.tick();
      if (race.gate === GATES) s.toast('Сүүлчийн тойрог!', 'Гийнгоо! Морио урамшуул');
      if (race.gate >= GATES * LAPS) {
        race.place = 1 + race.ai.filter((a) => a.done >= 0).length;
        race.state = 'done';
        s.finishRace(race.place, race.time);
      }
    }
  });

  return (
    <group ref={root}>
      <StartArch />
      <Tent />
      <Gates />
      <Officials />
      <group ref={riders}>
        {RACERS.map((_, i) => (
          <AiRider key={i} i={i} />
        ))}
      </group>
    </group>
  );
}
