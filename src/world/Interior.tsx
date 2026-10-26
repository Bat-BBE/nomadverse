'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/game/store';
import { onPress } from '@/game/input';
import { audio } from '@/game/audio';
import { carpetTexture, chestTexture, columnTexture, doorTexture, wallClothTexture } from '@/game/textures';
import { Smoke } from './Ger';
import type { QuestId } from '@/game/content';

const R = 3.6;
const WALL = 1.6;
const TOP = 2.95;
const TOONO = 0.75;
const ORANGE = '#c9541f';

// ---------------------------------------------------------------- clickable wrapper

function Clickable({ label, onSelect, children }: { label: string; onSelect: () => void; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const setHoverLabel = useGame((s) => s.setHover);
  const modal = useGame((s) => s.modal);
  useCursor(hover && !modal);

  useEffect(() => {
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (m && 'emissive' in m) {
        if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive.clone();
        m.emissive.copy(hover ? new THREE.Color('#6a3a10') : m.userData.baseEmissive);
      }
    });
  }, [hover]);

  return (
    <group
      ref={ref}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHover(true);
        setHoverLabel(label);
      }}
      onPointerOut={() => {
        setHover(false);
        setHoverLabel(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > 6 || useGame.getState().modal) return; // was a drag
        audio.click();
        onSelect();
      }}
    >
      {children}
    </group>
  );
}

function learn(id: string) {
  const s = useGame.getState();
  s.setModal({ type: 'info', id });
  if (['toono', 'uni', 'khana', 'bagana', 'golomt'].includes(id)) s.complete('ger' as QuestId, id);
}

// ---------------------------------------------------------------- structure

function Lattice() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const n = 84;
    const q = new THREE.Quaternion();
    const qz = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.2) continue; // door gap
      for (const tilt of [0.75, -0.75]) {
        e.set(0, -a + Math.PI / 2, 0);
        q.setFromEuler(e);
        qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
        q.multiply(qz);
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * (R - 0.04), WALL / 2, Math.sin(a) * (R - 0.04)), q, new THREE.Vector3(1, 1, 1)));
      }
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current?.setMatrixAt(i, m));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [mats]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, mats.length]} castShadow>
      <boxGeometry args={[0.035, WALL / Math.cos(0.75) - 0.15, 0.025]} />
      <meshLambertMaterial color={ORANGE} />
    </instancedMesh>
  );
}

function Uni() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const n = 72;
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const from = new THREE.Vector3(Math.cos(a) * (R - 0.02), WALL, Math.sin(a) * (R - 0.02));
      const to = new THREE.Vector3(Math.cos(a) * TOONO, TOP - 0.03, Math.sin(a) * TOONO);
      const dir = to.clone().sub(from);
      const len = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
      out.push(new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1)));
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current?.setMatrixAt(i, m));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [mats]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, mats.length]} castShadow>
      <cylinderGeometry args={[0.022, 0.03, 1, 5]} />
      <meshLambertMaterial color={ORANGE} />
    </instancedMesh>
  );
}

function Toono() {
  return (
    <group position-y={TOP}>
      {/* generous invisible hit area so the crown is easy to click past the roof poles */}
      <mesh position-y={-0.12} rotation-x={Math.PI / 2}>
        <circleGeometry args={[TOONO + 0.35, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[TOONO, 0.07, 8, 40]} />
        <meshLambertMaterial color={ORANGE} />
      </mesh>
      {/* curved cross bars (тооны нар) */}
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} rotation-y={r} position-y={0.12} castShadow>
          <torusGeometry args={[TOONO, 0.035, 6, 24, Math.PI]} />
          <meshLambertMaterial color={ORANGE} />
        </mesh>
      ))}
    </group>
  );
}

function Shell() {
  const cloth = useMemo(() => {
    const t = wallClothTexture().clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group>
      {/* wall cloth behind the lattice */}
      <mesh position-y={WALL / 2} castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.03, R + 0.03, WALL, 64, 1, true]} />
        <meshLambertMaterial map={cloth} side={THREE.DoubleSide} />
      </mesh>
      {/* inner roof cover */}
      <mesh position-y={(WALL + TOP) / 2 + 0.03} castShadow receiveShadow>
        <cylinderGeometry args={[TOONO + 0.02, R + 0.08, TOP - WALL, 64, 1, true]} />
        <meshLambertMaterial color="#efe3cc" side={THREE.DoubleSide} />
      </mesh>
      {/* floor boards + carpet */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[R + 0.05, 64]} />
        <meshLambertMaterial color="#8a6644" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow>
        <circleGeometry args={[2.3, 64]} />
        <meshLambertMaterial map={carpetTexture()} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- furniture

function Stove() {
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.color.setHSL(0.07, 1, 0.45 + Math.sin(clock.elapsedTime * 13) * 0.04 + Math.random() * 0.04);
  });
  return (
    <Clickable label="Гал голомт" onSelect={() => learn('golomt')}>
      <group>
        <mesh position-y={0.28} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.5, 0.6]} />
          <meshStandardMaterial color="#2b2b2d" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, 0.302]}>
          <planeGeometry args={[0.26, 0.18]} />
          <meshBasicMaterial ref={glow} color="#ff7a2a" />
        </mesh>
        {[-0.3, 0.3].map((x) =>
          [-0.24, 0.24].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.03, z]}>
              <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
              <meshStandardMaterial color="#1f1f20" />
            </mesh>
          ))
        )}
        {/* stove pipe up through the toono */}
        <mesh position={[0, (0.5 + TOP + 0.6) / 2, -0.23]}>
          <cylinderGeometry args={[0.065, 0.065, TOP + 0.1, 10]} />
          <meshStandardMaterial color="#3a3a3c" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    </Clickable>
  );
}

const potProfile = [
  [0.0, 0],
  [0.12, 0.0],
  [0.2, 0.04],
  [0.25, 0.12],
  [0.26, 0.2],
  [0.27, 0.22],
].map(([x, y]) => new THREE.Vector2(x, y));

const cupProfile = [
  [0.0, 0],
  [0.03, 0],
  [0.05, 0.02],
  [0.065, 0.06],
  [0.07, 0.065],
].map(([x, y]) => new THREE.Vector2(x, y));

function liquidColor(step: number, added: string[]) {
  if (step >= 4 && added.includes('milk')) return '#d9c3a0';
  if (step >= 4 || added.includes('tea')) return '#8a6a3a';
  return '#9fb7c0';
}

function Pot() {
  const tea = useGame((s) => s.tea);
  const ladle = useRef<THREE.Group>(null);
  const stream = useRef<THREE.Mesh>(null);
  const anim = useRef(0);
  const lastLadles = useRef(tea.ladles);
  useEffect(() => {
    if (tea.ladles !== lastLadles.current) {
      anim.current = 1;
      lastLadles.current = tea.ladles;
    }
  }, [tea.ladles]);
  useFrame((_, dt) => {
    anim.current = Math.max(0, anim.current - dt * 1.2);
    const a = anim.current;
    if (ladle.current) {
      const lift = Math.sin(a * Math.PI);
      ladle.current.position.y = 0.3 + lift * 0.55;
      ladle.current.rotation.z = -0.5 - lift * 0.9 * (a < 0.5 ? 1 : 0.4);
    }
    if (stream.current) stream.current.visible = a > 0.15 && a < 0.6;
  });
  const level = 0.03 + tea.water * 0.15;
  const steaming = tea.step >= 2 && tea.step < 7 && tea.boil > 0.4;
  return (
    <Clickable label="Цай чанах" onSelect={() => useGame.getState().setModal({ type: 'tea' })}>
      <group position={[0, 0.53, 0.14]}>
        <mesh castShadow>
          <latheGeometry args={[potProfile, 24]} />
          <meshStandardMaterial color="#2c2a27" metalness={0.45} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        {tea.water > 0 && (
          <mesh position-y={level} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.2 + tea.water * 0.05, 24]} />
            <meshLambertMaterial color={liquidColor(tea.step, tea.added)} />
          </mesh>
        )}
        {/* ladle (шанага) */}
        <group ref={ladle} position={[0.32, 0.3, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
            <meshStandardMaterial color="#b9bec4" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.07, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#b9bec4" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <mesh ref={stream} position={[0.22, 0.45, 0]} visible={false}>
          <cylinderGeometry args={[0.015, 0.02, 0.5, 6]} />
          <meshLambertMaterial color={liquidColor(tea.step, tea.added)} transparent opacity={0.85} />
        </mesh>
        {steaming && <Smoke position={[0, 0.2, 0]} count={10} scale={0.18} />}
      </group>
    </Clickable>
  );
}

function Table() {
  const cups = useGame((s) => s.tea.cups);
  const color = useGame((s) => liquidColor(s.tea.step, s.tea.added));
  return (
    <Clickable label="Цайны аяга" onSelect={() => useGame.getState().setModal({ type: 'tea' })}>
      <group position={[0, 0, -1.25]}>
        <mesh position-y={0.38} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.06, 0.55]} />
          <meshLambertMaterial color="#b8461c" />
        </mesh>
        {[
          [0.42, 0.22],
          [-0.42, 0.22],
          [0.42, -0.22],
          [-0.42, -0.22],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.18, z]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <meshLambertMaterial color="#8a3414" />
          </mesh>
        ))}
        {[-0.25, 0, 0.25].map((x, i) => (
          <group key={x} position={[x, 0.41, 0.05]}>
            <mesh castShadow>
              <latheGeometry args={[cupProfile, 18]} />
              <meshStandardMaterial color="#f3efe6" roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
            <mesh position-y={0.062} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.068, 0.006, 4, 18]} />
              <meshLambertMaterial color="#2e5e96" />
            </mesh>
            {cups > i && (
              <mesh position-y={0.05} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.06, 16]} />
                <meshLambertMaterial color={color} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </Clickable>
  );
}

function Chest({ x }: { x: number }) {
  const tex = chestTexture();
  return (
    <group position={[x, 0, -R + 0.55]}>
      <mesh position-y={0.36} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.72, 0.5]} />
        <meshLambertMaterial color="#9c3a16" />
      </mesh>
      <mesh position={[0, 0.36, 0.252]}>
        <planeGeometry args={[0.96, 0.68]} />
        <meshLambertMaterial map={tex} />
      </mesh>
    </group>
  );
}

function Bed({ side }: { side: 1 | -1 }) {
  const a = side > 0 ? -0.15 : Math.PI + 0.15;
  const rr = R - 0.55;
  return (
    <group position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} rotation-y={-a}>
      <mesh position-y={0.22} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.44, 1.9]} />
        <meshLambertMaterial color="#b8461c" />
      </mesh>
      <mesh position-y={0.47}>
        <boxGeometry args={[0.76, 0.08, 1.86]} />
        <meshLambertMaterial color="#7d1f1a" />
      </mesh>
      <mesh position={[0, 0.54, -0.75]}>
        <boxGeometry args={[0.6, 0.1, 0.3]} />
        <meshLambertMaterial color="#e9dcc0" />
      </mesh>
      <mesh position={[0, 0.515, 0.25]}>
        <boxGeometry args={[0.78, 0.04, 1.1]} />
        <meshLambertMaterial color="#2e5e96" />
      </mesh>
    </group>
  );
}

function Cupboard() {
  const a = Math.PI / 2 - 0.75; // east side near the door — the kitchen side
  const rr = R - 0.4;
  return (
    <group position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} rotation-y={-a - Math.PI / 2}>
      <mesh position-y={0.55} castShadow>
        <boxGeometry args={[0.95, 1.1, 0.45]} />
        <meshLambertMaterial color="#c9541f" />
      </mesh>
      <mesh position={[0, 0.55, 0.23]}>
        <planeGeometry args={[0.85, 1.0]} />
        <meshLambertMaterial map={doorTexture()} />
      </mesh>
      {/* dishes on top */}
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, 1.16, 0]}>
          <cylinderGeometry args={[0.09, 0.06, 0.1, 12]} />
          <meshLambertMaterial color="#f0ebe0" />
        </mesh>
      ))}
    </group>
  );
}

function MorinKhuur() {
  const a = Math.PI + 0.75; // west side toward the khoimor
  const rr = R - 0.25;
  return (
    <Clickable label="Морин хуур" onSelect={() => useGame.getState().setModal({ type: 'info', id: 'morinkhuur' })}>
      <group position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} rotation-y={-a - Math.PI / 2} rotation-x={-0.12}>
        <mesh position-y={0.45} castShadow>
          <boxGeometry args={[0.3, 0.42, 0.1]} />
          <meshLambertMaterial color="#7a4a24" />
        </mesh>
        <mesh position-y={0.95}>
          <boxGeometry args={[0.04, 0.6, 0.04]} />
          <meshLambertMaterial color="#5a3418" />
        </mesh>
        {/* carved horse head */}
        <mesh position={[0, 1.3, 0.04]} rotation-x={0.6}>
          <boxGeometry args={[0.07, 0.16, 0.08]} />
          <meshLambertMaterial color="#3a2414" />
        </mesh>
        <mesh position={[0, 0.98, 0.03]}>
          <boxGeometry args={[0.012, 1.0, 0.012]} />
          <meshLambertMaterial color="#e6dcc4" />
        </mesh>
      </group>
    </Clickable>
  );
}

function Saddle() {
  const a = Math.PI - 0.6; // west, near the door: the men's side
  const rr = R - 0.45;
  return (
    <group position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} rotation-y={-a}>
      <mesh position-y={0.25}>
        <boxGeometry args={[0.5, 0.5, 0.12]} />
        <meshLambertMaterial color="#6b4a2c" />
      </mesh>
      <mesh position-y={0.56}>
        <boxGeometry args={[0.4, 0.1, 0.5]} />
        <meshLambertMaterial color="#b8461c" />
      </mesh>
      <mesh position={[0, 0.68, 0.22]}>
        <boxGeometry args={[0.32, 0.2, 0.06]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- scene

function InteriorLights() {
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (fire.current) fire.current.intensity = 3.6 + Math.sin(clock.elapsedTime * 11) * 0.6 + Math.random() * 0.8;
  });
  return (
    <>
      <pointLight ref={fire} position={[0, 0.5, 0.6]} color="#ff9a4a" distance={7} decay={1.6} intensity={5} />
      <pointLight position={[0, 2.4, 0]} color="#ffe8c8" distance={6} decay={1.5} intensity={1.4} />
    </>
  );
}

export function Interior() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(1.25, 1.55, 1.85);
    camera.lookAt(-0.2, 1.0, -1.2);
  }, [camera]);

  // E (with no modal open) steps back outside
  useEffect(
    () =>
      onPress((code) => {
        const s = useGame.getState();
        if (code === 'KeyE' && s.scene === 'inside' && !s.modal && !s.fading) exitGer();
      }),
    []
  );

  useEffect(() => {
    useGame.getState().setPrompt('Гадагш гарах');
    return () => useGame.getState().setPrompt(null);
  }, []);

  return (
    <group>
      <OrbitControls
        makeDefault
        target={[-0.2, 1.0, -1.2]}
        enablePan={false}
        minDistance={1.2}
        maxDistance={3.4}
        minPolarAngle={0.9}
        maxPolarAngle={2.0}
        rotateSpeed={0.5}
        enableDamping
      />
      <InteriorLights />
      <Shell />
      <Clickable label="Хана" onSelect={() => learn('khana')}>
        <Lattice />
      </Clickable>
      <Clickable label="Унь" onSelect={() => learn('uni')}>
        <Uni />
      </Clickable>
      <Clickable label="Тооно" onSelect={() => learn('toono')}>
        <Toono />
      </Clickable>
      <Clickable label="Багана" onSelect={() => learn('bagana')}>
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, TOP / 2, -0.5]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, TOP, 10]} />
            <meshLambertMaterial map={columnTexture()} />
          </mesh>
        ))}
      </Clickable>
      <Stove />
      <Pot />
      <Table />
      <Clickable label="Авдар" onSelect={() => useGame.getState().setModal({ type: 'chest' })}>
        <Chest x={-0.58} />
        <Chest x={0.58} />
      </Clickable>
      <Bed side={1} />
      <Bed side={-1} />
      <Cupboard />
      <MorinKhuur />
      <Saddle />
      <Clickable label="Гадагш гарах" onSelect={exitGer}>
        <group position={[0, 0, R - 0.02]} rotation-y={Math.PI}>
          <mesh position-y={0.76}>
            <planeGeometry args={[0.9, 1.45]} />
            <meshLambertMaterial map={doorTexture()} />
          </mesh>
        </group>
      </Clickable>
    </group>
  );
}

export function exitGer() {
  const s = useGame.getState();
  s.goScene('outside');
}
