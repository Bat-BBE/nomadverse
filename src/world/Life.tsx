'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt, LOC, slopePitch } from '@/game/terrain';
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

/** Банхар: a big black herding dog with tan "four-eyed" brow spots. */
export function Dog() {
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const pos = useMemo(() => ({ x: -3.4, z: 4.6 }), []);
  const fur = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c1714', roughness: 0.95 }), []);
  const tan = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a86a32', roughness: 0.9 }), []);
  const st = useRef({ alert: 0 });

  useFrame(({ clock }, dt) => {
    const dx = world.player.x - pos.x;
    const dz = world.player.z - pos.z;
    const near = Math.hypot(dx, dz) < 7;
    const s = st.current;
    s.alert += ((near ? 1 : 0) - s.alert) * Math.min(1, dt * 3);
    const t = clock.elapsedTime;
    if (head.current) {
      // resting head lifts and follows the player when they come close
      const want = THREE.MathUtils.clamp(Math.atan2(dx, dz) - 0.9, -1.1, 1.1);
      head.current.rotation.y += ((near ? want : Math.sin(t * 0.2) * 0.3) - head.current.rotation.y) * Math.min(1, dt * 3);
      head.current.position.y = 0.32 + s.alert * 0.14;
      head.current.rotation.x = 0.35 - s.alert * 0.4 + Math.sin(t * 1.4) * 0.02;
    }
    if (tail.current) tail.current.rotation.z = Math.sin(t * (near ? 12 : 1.5)) * (near ? 0.5 : 0.1);
  });

  return (
    <group position={[pos.x, heightAt(pos.x, pos.z), pos.z]} rotation-y={0.9}>
      {/* lying body with thick coat */}
      <mesh position={[0, 0.24, -0.05]} rotation-x={Math.PI / 2} scale={[1.05, 1, 0.85]} material={fur} castShadow>
        <capsuleGeometry args={[0.2, 0.5, 6, 12]} />
      </mesh>
      <mesh position={[0, 0.3, 0.3]} scale={[0.22, 0.24, 0.2]} material={fur} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      {/* front legs stretched forward */}
      {[0.1, -0.1].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.07, 0.48]} rotation-x={Math.PI / 2} material={fur}>
            <capsuleGeometry args={[0.055, 0.28, 4, 8]} />
          </mesh>
          <mesh position={[x, 0.06, 0.66]} scale={[0.06, 0.04, 0.07]} material={tan}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      ))}
      {/* head */}
      <group ref={head} position={[0, 0.32, 0.42]}>
        <mesh scale={[0.15, 0.14, 0.16]} material={fur} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
        <mesh position={[0, -0.03, 0.16]} scale={[0.075, 0.07, 0.11]} material={fur}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        <mesh position={[0, -0.06, 0.18]} scale={[0.07, 0.04, 0.09]} material={tan}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        <mesh position={[0, -0.01, 0.265]} material={fur}>
          <sphereGeometry args={[0.022, 8, 6]} />
        </mesh>
        {[1, -1].map((sd) => (
          <group key={sd}>
            {/* the tan "second eyes" above the eyes */}
            <mesh position={[sd * 0.055, 0.06, 0.125]} material={tan}>
              <sphereGeometry args={[0.018, 8, 6]} />
            </mesh>
            <mesh position={[sd * 0.055, 0.025, 0.135]}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshStandardMaterial color="#2a1a0e" roughness={0.2} />
            </mesh>
            {/* floppy ears */}
            <mesh position={[sd * 0.12, 0.04, -0.01]} rotation={[0.2, 0, sd * 0.5]} scale={[0.03, 0.09, 0.07]} material={fur}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* bushy tail */}
      <group ref={tail} position={[0, 0.3, -0.48]}>
        <mesh position={[0.06, 0.05, -0.18]} rotation={[1.1, 0, 0.2]} scale={[1, 1, 1]} material={fur} castShadow>
          <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
        </mesh>
      </group>
    </group>
  );
}
