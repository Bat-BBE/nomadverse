'use client';
import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, BrightnessContrast, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useGame, world } from '@/game/store';
import { bindKeys } from '@/game/input';
import { Lights, Sky } from '@/world/Sky';
import { Mountains, Terrain } from '@/world/Terrain';
import { Clouds, Flowers, Grass, River, Scatter } from '@/world/Nature';
import { Camp, Ovoo } from '@/world/Ger';
import { Camels, Flock, PastureHorses } from '@/world/Animals';
import { cam, Player } from '@/world/Player';
import { Interior } from '@/world/Interior';
import { Mother } from '@/world/Npc';
import { Dog, Herder } from '@/world/Life';
import { Director } from '@/world/Director';
import { Overlay } from '@/ui/Overlay';

/** Debug: expose the R3F camera/scene for automated playtests (window.__nv.three). */
function DebugHandle() {
  const three = useThree();
  useEffect(() => {
    const w = window as unknown as { __nv?: Record<string, unknown> };
    w.__nv = { ...w.__nv, three };
  }, [three]);
  return null;
}

function Outside({ grass }: { grass: number }) {
  const scene = useGame((s) => s.scene);
  return (
    <group visible={scene === 'outside'}>
      <Terrain />
      <Mountains />
      <River />
      <Grass count={grass} />
      <Flowers count={grass > 100000 ? 5500 : 2500} />
      <Scatter />
      <Clouds />
      <Camp />
      <Ovoo />
      <PastureHorses />
      <Flock />
      <Camels />
      <Mother />
      <Herder />
      <Dog />
      <Player />
    </group>
  );
}

export default function Game() {
  const scene = useGame((s) => s.scene);
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    bindKeys();
    // debug handle for automated screenshots / tinkering in devtools
    const w = window as unknown as { __nv?: Record<string, unknown> };
    w.__nv = { ...w.__nv, useGame, world, cam };
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.matchMedia('(pointer: coarse)').matches || (nav.deviceMemory ?? 8) <= 4;
    setLowEnd(small);
  }, []);

  return (
    <main className="game-root">
      <Canvas
        shadows
        dpr={lowEnd ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [-150, 70, 150] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <fog attach="fog" args={['#e4c9a8', 90, 1000]} />
        <Suspense fallback={null}>
          <Sky />
          <Lights />
          <Outside grass={lowEnd ? 50000 : 150000} />
          {scene === 'inside' && <Interior />}
          <Director />
          <DebugHandle />
        </Suspense>
        {!lowEnd && (
          <EffectComposer multisampling={4}>
            <N8AO aoRadius={1.2} distanceFalloff={0.6} intensity={2.2} halfRes quality="performance" />
            <Bloom intensity={0.45} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
            <BrightnessContrast contrast={0.06} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.28} darkness={0.55} />
          </EffectComposer>
        )}
      </Canvas>
      <Overlay />
    </main>
  );
}
