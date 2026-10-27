'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, LOC } from '@/game/terrain';
import { useGame, world } from '@/game/store';
import { addStatic } from '@/game/colliders';
import { NPCS, type NpcId } from '@/game/content';
import { Human, type HumanHandle, type HumanPose } from './Human';

// The camp's people. Each NPC has a home spot and a resting activity; they turn
// to face the player when approached and greet with a small gesture.

export const NPC_SPOTS: Record<NpcId, { x: number; z: number; heading: number; pose: HumanPose }> = {
  tsetseg: { x: LOC.mother.x, z: LOC.mother.z, heading: 2.2, pose: 'stand' },
  batbayar: { x: -7.6, z: -5.2, heading: -2.4, pose: 'stand' },
  ganaa: { x: -9.0, z: 10.5, heading: -2.6, pose: 'sew' },
  dorj: { x: 10.8, z: 6.6, heading: -1.9, pose: 'sit' },
};

/** The craft area beside Ганаа: felt mat, wool, base felt and the rolling pole. */
export const FELT_AREA = { x: -11.6, z: 12.6 };

function NpcCharacter({ id }: { id: NpcId }) {
  const def = NPCS[id];
  const spot = NPC_SPOTS[id];
  const g = useRef<THREE.Group>(null);
  const h = useRef<HumanHandle>(null);
  useFrame(({ clock }, dt) => {
    const grp = g.current;
    if (!grp) return;
    const dx = world.player.x - spot.x;
    const dz = world.player.z - spot.z;
    const near = Math.hypot(dx, dz) < 6 && useGame.getState().scene === 'outside';
    // standing NPCs turn toward you; seated ones only turn a little
    const seated = spot.pose !== 'stand';
    let want = near ? Math.atan2(dx, dz) : spot.heading + Math.sin(clock.elapsedTime * 0.1 + spot.x) * 0.25;
    if (seated) {
      let d = want - spot.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      want = spot.heading + THREE.MathUtils.clamp(d, -0.6, 0.6);
    }
    let d = want - grp.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    grp.rotation.y += d * Math.min(1, dt * 2.5);
    if (h.current) {
      // seated craftsperson keeps working; others pause their idle when you are close
      h.current.anim.pose = spot.pose;
      h.current.anim.speed = 0;
    }
  });
  return (
    <group ref={g} position={[spot.x, heightAt(spot.x, spot.z), spot.z]} rotation-y={spot.heading}>
      {spot.pose !== 'stand' && (
        // a small felt mat to sit on
        <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.55, 24]} />
          <meshStandardMaterial color="#c9b58a" roughness={1} />
        </mesh>
      )}
      <Human ref={h} {...def.look} seed={id.length * 3} />
    </group>
  );
}

export function Villagers() {
  return (
    <>
      {(Object.keys(NPCS) as NpcId[]).map((id) => (
        <NpcCharacter key={id} id={id} />
      ))}
      <FeltArea />
    </>
  );
}

/** Felt-making corner: shows the material's progress (wool pile → felt). */
let feltRegistered = false;
function FeltArea() {
  if (!feltRegistered) {
    feltRegistered = true;
    // the rolled felt bundle and the water bucket (group is rotated 0.4 rad)
    const rot = (lx: number, lz: number) => ({ x: FELT_AREA.x + lx * Math.cos(0.4) + lz * Math.sin(0.4), z: FELT_AREA.z - lx * Math.sin(0.4) + lz * Math.cos(0.4) });
    addStatic([{ ...rot(1.4, -0.3), r: 0.5 }, { ...rot(-1.25, -0.6), r: 0.22 }]);
  }
  const done = useGame((s) => s.activitiesDone.includes('felting'));
  const hasWool = useGame((s) => (s.inventory.wool ?? 0) > 0);
  const { x, z } = FELT_AREA;
  const y = heightAt(x, z);
  const woolGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + Math.sin(p.getX(i) * 9) * Math.sin(p.getZ(i) * 7) * 0.12;
      p.setXYZ(i, p.getX(i) * k, Math.max(0, p.getY(i)) * k * 0.5, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={[x, y, z]} rotation-y={0.4}>
      {/* эх эсгий: the old base felt spread on the ground */}
      <mesh position-y={0.015} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial color="#b9a888" roughness={1} />
      </mesh>
      {/* wool waiting to be worked (or the finished felt once made) */}
      {done ? (
        <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.0, 1.3]} />
          <meshStandardMaterial color="#e6dcc6" roughness={1} />
        </mesh>
      ) : (
        <mesh position={[-0.5, 0.02, 0.1]} scale={[0.45, hasWool ? 0.5 : 0.35, 0.35]} geometry={woolGeo}>
          <meshStandardMaterial color="#ebe3cf" roughness={1} />
        </mesh>
      )}
      {/* rolling pole and two beating sticks */}
      <mesh position={[0, 0.06, -0.95]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 10]} />
        <meshStandardMaterial color="#8a6440" roughness={0.8} />
      </mesh>
      {[0.6, 0.75].map((dx) => (
        <mesh key={dx} position={[dx, 0.03, 0.7]} rotation={[Math.PI / 2, 0, 0.3]}>
          <cylinderGeometry args={[0.015, 0.018, 1.0, 6]} />
          <meshStandardMaterial color="#9a7a50" roughness={0.8} />
        </mesh>
      ))}
      {/* a rolled felt bundle tied with rope */}
      <group position={[1.4, 0.18, -0.3]} rotation-y={0.3}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.18, 0.18, 1.1, 16]} />
          <meshStandardMaterial color="#cfc3a8" roughness={1} />
        </mesh>
        {[-0.35, 0.35].map((dx) => (
          <mesh key={dx} position-x={dx} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.185, 0.012, 4, 20]} />
            <meshStandardMaterial color="#6e5034" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* water bucket */}
      <mesh position={[-1.25, 0.15, -0.6]}>
        <cylinderGeometry args={[0.15, 0.13, 0.3, 14]} />
        <meshStandardMaterial color="#8a5e36" roughness={0.8} />
      </mesh>
    </group>
  );
}
