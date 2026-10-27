'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getQuality, saveSummary, setQuality, useGame, type Quality } from '@/game/store';
import { audio } from '@/game/audio';
import { Arrow, Gear, Sound } from './Icons';

// The landing screen: a cinematic opening over the live 3D valley. Letterbox
// bars, a self-drawing mountain mark, letters that rise into place with a
// slow gold shimmer, a real game menu, drifting motes in the sunlight and the
// words "Монгол нутаг" in traditional script down the right edge.

const TITLE = 'NOMADVERSE';
const ease = [0.2, 0.7, 0.2, 1] as const;

function MountainMark() {
  // drawn as strokes, then filled
  return (
    <svg className="mark" viewBox="0 0 160 60" aria-hidden>
      <motion.path
        d="M2 58 L48 18 L60 28 L84 4 L104 26 L114 18 L158 58"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.9, duration: 1.8, ease: 'easeInOut' }}
      />
      <motion.path
        d="M0 60 L48 18 L60 28 L84 4 L104 26 L114 18 L160 60 Z"
        fill="currentColor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.95 }}
        transition={{ delay: 2.3, duration: 1.2 }}
      />
      <motion.path
        d="M84 4 L76 16 L84 13 L90 20 L95 16 Z M48 18 L42 26 L49 23 L54 28 Z"
        fill="#14213d"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 2.6, duration: 1 }}
      />
    </svg>
  );
}

function Motes() {
  // golden dust drifting through the low sun
  const motes = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: (i * 37) % 100,
        top: 15 + ((i * 53) % 80),
        size: 2 + ((i * 7) % 4),
        dur: 14 + ((i * 11) % 12),
        delay: -((i * 3.7) % 20),
        drift: ((i % 5) - 2) * 18,
      })),
    []
  );
  return (
    <div className="motes" aria-hidden>
      {motes.map((m, i) => (
        <span
          key={i}
          style={
            {
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: m.size,
              height: m.size,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
              '--drift': `${m.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const soundOn = useGame((s) => s.soundOn);
  const [q, setQ] = useState<Quality>(getQuality());
  const initial = useRef(getQuality());
  return (
    <motion.div className="title-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
      <div className="eyebrow">Тохиргоо</div>
      <div className="ts-row">
        <span>Дуу</span>
        <button className={`chip ${soundOn ? 'on' : ''}`} onClick={() => useGame.getState().toggleSound()}>
          {soundOn ? 'Асаалттай' : 'Унтраалттай'}
        </button>
      </div>
      <div className="ts-row">
        <span>Графикийн чанар</span>
        <div className="chips">
          {(
            [
              ['auto', 'Автомат'],
              ['high', 'Өндөр'],
              ['low', 'Хөнгөн'],
            ] as [Quality, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              className={`chip ${q === id ? 'on' : ''}`}
              onClick={() => {
                setQ(id);
                setQuality(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="note">Хөнгөн горимд өвс цөөрч, эффектүүд унтарна — сул төхөөрөмж, утсанд тохиромжтой.</p>
      <div className="row">
        {q !== initial.current && (
          <button className="ghost" onClick={() => window.location.reload()}>
            Хэрэгжүүлэх (дахин ачаална)
          </button>
        )}
        <button className="primary" onClick={onClose}>
          Болсон
        </button>
      </div>
    </motion.div>
  );
}

export function Title() {
  const phase = useGame((s) => s.phase);
  const soundOn = useGame((s) => s.soundOn);
  const hasSave = useGame((s) => s.hasSave);
  const summary = useMemo(() => (hasSave ? saveSummary() : null), [hasSave]);
  const [confirm, setConfirm] = useState(false);
  const [settings, setSettings] = useState(false);
  const block = useRef<HTMLDivElement>(null);
  const script = useRef<HTMLDivElement>(null);

  // gentle parallax: the title and script drift against the mouse
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (block.current) block.current.style.transform = `translate3d(${x * -14}px, ${y * -10}px, 0)`;
      if (script.current) script.current.style.transform = `translate3d(${x * 10}px, ${y * 8}px, 0)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const wake = () => {
    audio.start();
    audio.setEnabled(useGame.getState().soundOn);
    audio.click();
  };
  const newJourney = () => {
    if (hasSave && !confirm) {
      setConfirm(true);
      return;
    }
    wake();
    useGame.getState().newJourney();
  };
  const cont = () => {
    wake();
    useGame.getState().continueJourney();
  };

  const items: { key: string; label: string; sub?: string; run: () => void; main?: boolean }[] = [];
  if (summary)
    items.push({ key: 'cont', label: 'Үргэлжлүүлэх', sub: `${summary.name} · ${summary.xp} XP · ${summary.quests}/10 даалгавар`, run: cont, main: true });
  items.push({
    key: 'new',
    label: confirm ? 'Дахин дарж батлах' : 'Шинэ аялал',
    sub: confirm ? 'Хадгалсан явц дарагдана' : 'Дүрээ бүтээж, нүүдэлчдийн хотонд оч',
    run: newJourney,
    main: !summary,
  });
  items.push({ key: 'set', label: 'Тохиргоо', sub: 'Дуу, графикийн чанар', run: () => setSettings(true) });

  return (
    <AnimatePresence>
      {phase === 'title' && (
        <motion.div className="title2" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 1 } }}>
          {/* opening: black fade, then film bars that relax */}
          <motion.div className="t-black" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          <motion.div className="t-bar top" initial={{ height: '14vh' }} animate={{ height: '6vh' }} transition={{ delay: 0.6, duration: 2.2, ease }} />
          <motion.div className="t-bar bottom" initial={{ height: '14vh' }} animate={{ height: '6vh' }} transition={{ delay: 0.6, duration: 2.2, ease }} />
          <div className="t-shade" />
          <div className="t-sun" />
          <Motes />

          <motion.div className="t-script" ref={script} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2, duration: 2.4 }} aria-label="Монгол нутаг">
            ᠮᠣᠩᠭᠣᠯ ᠨᠤᠲᠤᠭ
          </motion.div>

          <div className="t-block" ref={block}>
            <span className="t-mark">
              <MountainMark />
            </span>
            <h1 className="t-title" aria-label={TITLE}>
              {TITLE.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 1.5 + i * 0.07, duration: 1.1, ease }}
                >
                  {ch}
                </motion.span>
              ))}
              <span className="t-shine" aria-hidden>
                {TITLE}
              </span>
            </h1>
            <motion.div className="t-rule" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.6, duration: 1.4, ease }}>
              <i />
              <b>INTERACTIVE 3D MONGOLIA</b>
              <i />
            </motion.div>
            <motion.p className="t-tagline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.0, duration: 1.2 }}>
              Discover the Soul of Mongolia.
            </motion.p>
            <motion.p className="t-lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4, duration: 1.2 }}>
              Мал маллаж, сүү саагаад ааруул хийж, эсгий урлан, морь унаж, нүүдэлчин айлын амьдралыг өөрийн гараар мэдэр.
            </motion.p>

            <nav className="t-menu">
              {items.map((it, i) => (
                <motion.button
                  key={it.key}
                  className={`t-item ${it.main ? 'main' : ''}`}
                  onClick={it.run}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 3.8 + i * 0.18, duration: 0.9, ease }}
                >
                  <span className="t-diamond" />
                  <span className="t-label">
                    <strong>{it.label}</strong>
                    {it.sub && <small>{it.sub}</small>}
                  </span>
                  <Arrow />
                </motion.button>
              ))}
            </nav>
          </div>

          <motion.div className="t-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6, duration: 1.2 }}>
            <button className="t-sound" onClick={() => useGame.getState().toggleSound()} aria-label="Дуу">
              <Sound on={soundOn} size={18} />
              <span>{soundOn ? 'Дуу асаалттай' : 'Дуугүй'}</span>
            </button>
            <div className="t-pillars">
              <span>Малчин ахуй</span>
              <i />
              <span>Цагаан идээ</span>
              <i />
              <span>Эсгий, оёдол</span>
              <i />
              <span>Морин соёл</span>
            </div>
            <button className="t-sound" onClick={() => setSettings(true)} aria-label="Тохиргоо">
              <Gear size={18} />
            </button>
          </motion.div>

          <AnimatePresence>{settings && <Settings onClose={() => setSettings(false)} />}</AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
