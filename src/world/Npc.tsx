'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LOC } from '@/game/terrain';
import { world } from '@/game/store';
import { Human } from './Human';

/** Ээж: stands by the door, turns to face the player when they come close. */
export function Mother() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const grp = g.current;
    if (!grp) return;
    const dx = world.player.x - LOC.mother.x;
    const dz = world.player.z - LOC.mother.z;
    const near = Math.hypot(dx, dz) < 9;
    // otherwise she looks out over the valley toward the sunrise
    const want = near ? Math.atan2(dx, dz) : 2.2 + Math.sin(clock.elapsedTime * 0.1) * 0.3;
    let d = want - grp.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    grp.rotation.y += d * Math.min(1, dt * 2.5);
  });
  return (
    <group ref={g} position={[LOC.mother.x, 0, LOC.mother.z]} rotation-y={2.2}>
      <Human woman deel="#7a2f6e" trim="#e0b24e" sash="#3f8a7a" skin="#b68262" seed={3} />
    </group>
  );
}
