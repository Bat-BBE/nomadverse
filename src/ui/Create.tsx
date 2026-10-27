'use client';
import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { DEFAULT_PROFILE, useGame, type Profile } from '@/game/store';
import { START_PREFS, type StartPref } from '@/game/content';
import { audio } from '@/game/audio';
import { Human, type HumanHandle } from '@/world/Human';
import { ActivityIcon, Arrow } from './Icons';

// New Journey: choose a man or woman, dress them, pick what to try first.
// The preview is the very same procedural Human used in the world.

const DEEL = ['#2a5a96', '#7a2f6e', '#2f6b5a', '#8a2a1e', '#5a5a6e', '#c08a2e'];
const SASH = ['#e39b2f', '#3f8a7a', '#b8461c', '#2f5f9a', '#e8e2d2'];
const HEAD = ['#9e2a1c', '#2f5f9a', '#3a3a3a', '#d9b45a'];
const BOOTS = ['#5a1f14', '#2a2420', '#7a4a2a'];
const HATS: { id: Profile['hatStyle']; label: string }[] = [
  { id: 'malgai', label: 'Малгай' },
  { id: 'toortsog', label: 'Тоорцог' },
  { id: 'scarf', label: 'Алчуур' },
  { id: 'none', label: 'Малгайгүй' },
];

const FEMALE: Partial<Profile> = { woman: true, name: 'Сараа', hatStyle: 'scarf', hair: 'braid', headColor: '#d9b45a', boots: '#7a2a1c', deel: '#7a2f6e', sash: '#3f8a7a' };
const MALE: Partial<Profile> = { woman: false, name: 'Тэмүүлэн', hatStyle: 'malgai', hair: 'short', headColor: '#9e2a1c', boots: '#5a1f14', deel: '#2a5a96', sash: '#e39b2f' };

function Preview({ profile, yaw }: { profile: Profile; yaw: React.MutableRefObject<number> }) {
  const g = useRef<THREE.Group>(null);
  const h = useRef<HumanHandle>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    // spin slowly unless the player is turning it by hand
    if (!yaw.current) g.current.rotation.y += dt * 0.35;
    else {
      g.current.rotation.y += yaw.current;
      yaw.current = 0;
    }
    if (h.current) h.current.anim.pose = 'stand';
  });
  return (
    <group ref={g} position-y={-0.92}>
      {/* rebuild when gender changes so proportions update */}
      <Human key={profile.woman ? 'w' : 'm'} ref={h} {...profile} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[0.9, 48]} />
        <meshStandardMaterial color="#c9b58a" roughness={1} />
      </mesh>
    </group>
  );
}

export function CreateScreen() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [pref, setPref] = useState<StartPref | null>(null);
  const yaw = useRef(0);
  const drag = useRef<number | null>(null);
  const set = (p: Partial<Profile>) => {
    audio.click();
    setProfile((o) => ({ ...o, ...p }));
  };
  const steps = ['Дүр', 'Гадаад төрх', 'Эхлэх ажил'];
  const begin = () => {
    if (!pref) return;
    audio.success();
    useGame.getState().beginJourney({ ...profile, name: profile.name.trim() || (profile.woman ? 'Сараа' : 'Тэмүүлэн') }, pref);
  };

  return (
    <motion.div className="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div
        className="create-preview"
        onPointerDown={(e) => (drag.current = e.clientX)}
        onPointerMove={(e) => {
          if (drag.current === null) return;
          yaw.current += (e.clientX - drag.current) * 0.012;
          drag.current = e.clientX;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <Canvas shadows camera={{ position: [0, 0.35, 3.1], fov: 34 }} dpr={[1, 1.75]}>
          <hemisphereLight args={['#cfe0ff', '#7a6448', 1.1]} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.4} color="#ffe2b8" castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#9fb8e8" />
          <Preview profile={profile} yaw={yaw} />
        </Canvas>
        <div className="preview-hint">Чирж эргүүлнэ</div>
      </div>

      <div className="create-panel">
        <div className="eyebrow">Шинэ аялал</div>
        <ol className="create-steps">
          {steps.map((t, i) => (
            <li key={t} className={i === step ? 'now' : i < step ? 'done' : ''}>
              <b>{i + 1}</b>
              {t}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="create-body">
            <h2>Хэн болж аялах вэ?</h2>
            <div className="gender-row">
              {[
                { w: false, label: 'Эрэгтэй', sub: 'Дээл, малгай, гутал' },
                { w: true, label: 'Эмэгтэй', sub: 'Дээл, алчуур, гэзэг' },
              ].map((o) => (
                <button key={o.label} className={`gender ${profile.woman === o.w ? 'on' : ''}`} onClick={() => set(o.w ? FEMALE : MALE)}>
                  <strong>{o.label}</strong>
                  <small>{o.sub}</small>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Нэр</span>
              <input value={profile.name} maxLength={16} onChange={(e) => setProfile((o) => ({ ...o, name: e.target.value }))} />
            </label>
            <p className="note">Бүх ажил, бүх даалгавар эрэгтэй, эмэгтэй аль ч дүрд адилхан нээлттэй.</p>
          </div>
        )}

        {step === 1 && (
          <div className="create-body">
            <h2>Гадаад төрх</h2>
            <div className="opt">
              <span>Дээл</span>
              <div className="swatches">
                {DEEL.map((c) => (
                  <button key={c} aria-label={c} className={`sw ${profile.deel === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ deel: c })} />
                ))}
              </div>
            </div>
            <div className="opt">
              <span>Бүс</span>
              <div className="swatches">
                {SASH.map((c) => (
                  <button key={c} aria-label={c} className={`sw ${profile.sash === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ sash: c })} />
                ))}
              </div>
            </div>
            <div className="opt">
              <span>Толгойн өмсгөл</span>
              <div className="chips">
                {HATS.map((h) => (
                  <button key={h.id} className={`chip ${profile.hatStyle === h.id ? 'on' : ''}`} onClick={() => set({ hatStyle: h.id })}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            {profile.hatStyle !== 'none' && (
              <div className="opt">
                <span>Өнгө</span>
                <div className="swatches">
                  {HEAD.map((c) => (
                    <button key={c} aria-label={c} className={`sw ${profile.headColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ headColor: c })} />
                  ))}
                </div>
              </div>
            )}
            <div className="opt">
              <span>Үс</span>
              <div className="chips">
                {(profile.woman
                  ? [
                      { id: 'braid' as const, label: 'Нэг гэзэг' },
                      { id: 'twobraids' as const, label: 'Хоёр гэзэг' },
                    ]
                  : [
                      { id: 'short' as const, label: 'Богино' },
                      { id: 'braid' as const, label: 'Гэзэг' },
                    ]
                ).map((h) => (
                  <button key={h.id} className={`chip ${profile.hair === h.id ? 'on' : ''}`} onClick={() => set({ hair: h.id })}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="opt">
              <span>Гутал</span>
              <div className="swatches">
                {BOOTS.map((c) => (
                  <button key={c} aria-label={c} className={`sw ${profile.boots === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ boots: c })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="create-body">
            <h2>Юунаас эхлэх вэ?</h2>
            <p className="note">Энэ нь зөвхөн эхний даалгаврыг сонгоно. Бусад бүх ажил хожим ч нээлттэй.</p>
            <div className="pref-grid">
              {START_PREFS.map((p) => (
                <button
                  key={p.id}
                  className={`pref ${pref === p.id ? 'on' : ''}`}
                  onClick={() => {
                    audio.click();
                    setPref(p.id);
                  }}
                >
                  <span className="pref-icon">
                    <ActivityIcon id={p.id} size={34} />
                  </span>
                  <strong>{p.title}</strong>
                  <small className="pref-latin">{p.latin}</small>
                  <small>{p.desc}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="create-nav">
          {step > 0 ? (
            <button className="ghost" onClick={() => setStep(step - 1)}>
              ← Буцах
            </button>
          ) : (
            <button className="ghost" onClick={() => useGame.getState().setPhase('title')}>
              ← Гарчиг
            </button>
          )}
          {step < 2 ? (
            <button className="primary" onClick={() => setStep(step + 1)}>
              Дараах <Arrow size={16} />
            </button>
          ) : (
            <button className="primary" disabled={!pref} onClick={begin}>
              Аялалд гарах <Arrow size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
