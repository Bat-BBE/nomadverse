'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { activeQuest, isDone, useGame, world } from '@/game/store';
import { CHEST_ITEMS, INFO, QUESTS } from '@/game/content';
import { keys, onPress, press } from '@/game/input';
import { audio } from '@/game/audio';
import { TOD_LABELS } from '@/game/tod';
import { cam, objectiveTarget } from '@/world/Player';
import { TeaPanel } from './TeaPanel';
import { Arrow, Compass, Gear, Home, Journal, MountainLogo, Ornament, Sound, Sun } from './Icons';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 } };

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);
  return touch;
}

// ---------------------------------------------------------------- title

function Title() {
  const phase = useGame((s) => s.phase);
  const soundOn = useGame((s) => s.soundOn);
  const enter = () => {
    audio.start();
    audio.setEnabled(useGame.getState().soundOn);
    audio.click();
    useGame.getState().setPhase('entering');
  };
  return (
    <AnimatePresence>
      {phase === 'title' && (
        <motion.div className="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.9 } }}>
          <div className="title-vignette" />
          <div className="logo">
          <motion.div
            className="logo-inner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 1.8, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <span className="logo-mark">
              <MountainLogo size={150} />
            </span>
            <h1>NOMADVERSE</h1>
            <div className="logo-sub">
              <i />
              INTERACTIVE 3D MONGOLIA
              <i />
            </div>
            <p className="tagline">Discover the Soul of Mongolia.</p>
          </motion.div>
          </div>

          <motion.blockquote className="quote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1.4 }}>
            “Монголын ахуй, соёл, байгаль…
            <br />
            Одоо таны ертөнцөд”
          </motion.blockquote>

          <div className="start-wrap">
          <motion.button
            className="start-btn"
            onClick={enter}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.8, duration: 1.1 }}
          >
            <span className="start-peak">
              <MountainLogo size={34} />
            </span>
            <span>ENTER THE STEPPE</span>
            <Arrow />
          </motion.button>
          </div>

          <motion.div className="title-icons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2, duration: 1 }}>
            <button onClick={() => useGame.getState().toggleSound()} aria-label="Дуу" title={soundOn ? 'Дуу асаалттай' : 'Дуугүй'}>
              <Sound on={soundOn} />
            </button>
            <span className="title-line" />
          </motion.div>

          <motion.div className="title-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4, duration: 1 }}>
            <Ornament size={14} /> EXPLORE <b>/</b> LIVE <b>/</b> BUILD <b>/</b> TOGETHER <Ornament size={14} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- HUD

function QuestPanel() {
  const questsDone = useGame((s) => s.questsDone);
  const steps = useGame((s) => s.steps);
  const circle = useGame((s) => s.circle);
  const touch = useIsTouch();
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(!touch), [touch]);
  const q = activeQuest(questsDone);
  const next = q?.steps.find((st) => !isDone(steps, q.id, st.id));
  return (
    <motion.aside className={`quest panel ${open ? '' : 'collapsed'}`} {...fade} onClick={() => touch && setOpen(!open)}>
      <div className="panel-head">
        <span className="panel-icon">
          <Home size={18} />
        </span>
        <div>
          <div className="eyebrow">
            Даалгавар {Math.min(questsDone.length + 1, QUESTS.length)}/{QUESTS.length}
          </div>
          <h2>{q ? q.title : 'Тал нутгийн эзэн'}</h2>
        </div>
      </div>
      {!open && next && <div className="quest-next">{next.label}</div>}
      {open &&
        (q ? (
          <>
            <p>{q.desc}</p>
            <ul>
              {q.steps.map((st) => {
                const done = isDone(steps, q.id, st.id);
                const isCircle = q.id === 'ovoo' && st.id === 'circle';
                return (
                  <li key={st.id} className={done ? 'done' : ''}>
                    <span className="check" />
                    <span className="label">{st.label}</span>
                    <span className="count">{isCircle && !done ? `${circle}/3` : done ? '1/1' : '0/1'}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p>Бүх даалгавар биелсэн. Хөндийгөөр чөлөөтэй аялж, үдшийн тэнгэрийг ажигла.</p>
        ))}
    </motion.aside>
  );
}

function TopBar() {
  const xp = useGame((s) => s.xp);
  const tod = useGame((s) => s.tod);
  const soundOn = useGame((s) => s.soundOn);
  const g = () => useGame.getState();
  return (
    <motion.div className="topbar" {...fade}>
      <div className="xp" title="Туршлагын оноо">
        <span>{xp}</span>
        <small>XP</small>
      </div>
      <button className="icon-btn" onClick={() => g().cycleTod()} title={`Цаг: ${TOD_LABELS[tod]} (T)`} aria-label="Өдрийн цаг">
        <Sun />
      </button>
      <button className="icon-btn" onClick={() => g().setModal({ type: 'journal' })} title="Аяллын тэмдэглэл (J)" aria-label="Тэмдэглэл">
        <Journal />
      </button>
      <button className="icon-btn" onClick={() => g().toggleSound()} title="Дуу" aria-label="Дуу">
        <Sound on={soundOn} />
      </button>
      <button className="icon-btn" onClick={() => g().setModal({ type: 'menu' })} title="Тохиргоо (Esc)" aria-label="Тохиргоо">
        <Gear />
      </button>
    </motion.div>
  );
}

const DIRS: [string, number][] = [
  ['Х', 0],
  ['ЗХ', Math.PI / 4],
  ['З', Math.PI / 2],
  ['ЗӨ', (Math.PI * 3) / 4],
  ['Ө', Math.PI],
  ['БӨ', (-Math.PI * 3) / 4],
  ['Б', -Math.PI / 2],
  ['БХ', -Math.PI / 4],
];

/** Horizontal compass: Хойд/Зүүн/Өмнөд/Баруун plus a gold marker for the current objective. */
function CompassBar() {
  const scene = useGame((s) => s.scene);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = bar.current;
      if (!el) return;
      const w = el.clientWidth;
      const heading = -cam.yaw; // camera forward bearing, 0 = north, clockwise
      const place = (node: HTMLElement, bearing: number) => {
        let rel = bearing - heading;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const x = (rel / (Math.PI * 0.75)) * (w / 2) + w / 2;
        node.style.transform = `translateX(${x}px)`;
        node.style.opacity = String(Math.max(0, 1 - Math.abs(rel) / (Math.PI * 0.7)));
      };
      el.querySelectorAll<HTMLElement>('[data-b]').forEach((n) => place(n, Number(n.dataset.b)));
      const mark = el.querySelector<HTMLElement>('.cmp-goal');
      const t = objectiveTarget();
      if (mark) {
        if (t) {
          mark.style.display = '';
          place(mark, Math.atan2(t.x - world.player.x, -(t.z - world.player.z)));
          const d = Math.hypot(t.x - world.player.x, t.z - world.player.z);
          mark.dataset.dist = d > 8 ? `${Math.round(d)} м` : '';
        } else mark.style.display = 'none';
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  if (scene !== 'outside') return null;
  return (
    <div className="compass" ref={bar} aria-hidden>
      {DIRS.map(([l, b]) => (
        <span key={l} data-b={b} className={l.length === 1 ? 'cmp-main' : 'cmp-sub'}>
          {l}
        </span>
      ))}
      <span className="cmp-goal" />
      <i className="cmp-center" />
    </div>
  );
}

function Prompt() {
  const prompt = useGame((s) => s.prompt);
  const hover = useGame((s) => s.hover);
  const scene = useGame((s) => s.scene);
  const modal = useGame((s) => s.modal);
  if (modal) return null;
  return (
    <div className="prompt-wrap">
      <AnimatePresence mode="wait">
        {scene === 'inside' && hover ? (
          <motion.div key={'h' + hover} className="prompt hover" {...fade}>
            {hover}
          </motion.div>
        ) : prompt ? (
          <motion.button key={prompt} className="prompt" {...fade} onClick={() => press('KeyE')}>
            <kbd>E</kbd>
            {prompt}
          </motion.button>
        ) : null}
      </AnimatePresence>
      {scene === 'inside' && !hover && <div className="inside-hint">Эд зүйлс дээр дарж танилц · Чирж эргэн тойрноо хар</div>}
    </div>
  );
}

function Hints() {
  const [show, setShow] = useState(true);
  const mounted = useGame((s) => s.mounted);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 22000);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {(show || mounted) && (
        <motion.div className="hints panel" {...fade}>
          {mounted ? (
            <>
              <span><kbd>W</kbd> урагш</span>
              <span><kbd>A</kbd><kbd>D</kbd> эргэх</span>
              <span><kbd>Shift</kbd> давхих</span>
              <span><kbd>E</kbd> буух</span>
            </>
          ) : (
            <>
              <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> алхах</span>
              <span><kbd>Shift</kbd> гүйх</span>
              <span>Хулгана чирэх — камер</span>
              <span><kbd>E</kbd> харилцах</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Ornament size={14} />
            <div>
              <strong>{t.text}</strong>
              {t.sub && <span>{t.sub}</span>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- touch controls

function TouchControls() {
  const touch = useIsTouch();
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [run, setRun] = useState(false);
  const mounted = useGame((s) => s.mounted);
  const scene = useGame((s) => s.scene);
  useEffect(() => {
    keys.ShiftLeft = run;
  }, [run]);
  if (!touch || scene !== 'outside') return null;
  const R = 48;
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(x, y);
    if (l > R) {
      x = (x / l) * R;
      y = (y / l) * R;
    }
    setKnob({ x, y });
    world.input.x = x / R;
    world.input.y = y / R;
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    world.input.x = 0;
    world.input.y = 0;
  };
  return (
    <>
      <div
        ref={base}
        className="joy"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => e.buttons && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="joy-ring" />
        <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="touch-actions">
        <button className={`touch-run ${run ? 'on' : ''}`} onClick={() => setRun(!run)}>
          {mounted ? 'Давхих' : 'Гүйх'}
        </button>
        <button className="touch-e" onClick={() => press('KeyE')}>
          E
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- modals

function InfoCard({ id, onBack }: { id: string; onBack?: () => void }) {
  const info = INFO[id];
  if (!info) return null;
  return (
    <div className="info">
      {info.latin && <div className="eyebrow">{info.latin}</div>}
      <h3>{info.title}</h3>
      <div className="rule" />
      <p>{info.body}</p>
      {onBack && (
        <button className="ghost" onClick={onBack}>
          ← Буцах
        </button>
      )}
    </div>
  );
}

function Chest() {
  const [sel, setSel] = useState<string | null>(null);
  if (sel) return <InfoCard id={sel} onBack={() => setSel(null)} />;
  return (
    <div className="info">
      <div className="eyebrow">Avdar — chest</div>
      <h3>Авдар</h3>
      <div className="rule" />
      <p>Хойморт залсан авдарт өрхийн үнэт зүйлс, баярын хувцас, хадаг хадгалдаг. Нэгийг сонгож танилц.</p>
      <div className="items">
        {CHEST_ITEMS.map((k) => (
          <button
            key={k}
            className="item"
            onClick={() => {
              audio.click();
              useGame.setState((s) => ({ steps: { ...s.steps, [`info.${k}`]: true } }));
              setSel(k);
            }}
          >
            <span className={`item-icon icon-${k}`} />
            {INFO[k].title}
          </button>
        ))}
      </div>
    </div>
  );
}

function motherLine(): string[] {
  const s = useGame.getState();
  const done = s.questsDone;
  if (!done.includes('morning'))
    return ['Өглөөний мэнд, миний хүү!', 'Адуугаа нэг эргээд, голоос ус аваад ир. Дараа нь хамтдаа өглөөний цайгаа чанацгаая.'];
  if (!done.includes('tea')) return ['Ус авчирсан уу? Сайн байна.', 'Гэрт ороод зуухан дээрх тогоонд сүүтэй цайгаа чанаарай. Самраад, дээжийг нь хойморт барина шүү.'];
  if (!done.includes('ger')) return ['Цай чинь ямар сайхан болсон бэ.', 'Гэрийнхээ тооно, унь, хана, баганыг сайн таньж мэдээрэй. Нүүдэлчин хүн гэрээ барьж, буулгаж чаддаг байх ёстой.'];
  if (!done.includes('ride') || !done.includes('ovoo'))
    return ['Морь чинь уяан дээр чамайг хүлээж байна.', 'Баруун хойд толгойн овоонд гараад, нар зөв гурав тойрч, чулуу өргөөрэй. Замдаа болгоомжтой яваарай.'];
  return ['Сайн явж ирлээ, миний хүү.', 'Нар жаргаж байна. Тал нутгийн үдэш ямар сайхан бэ — одод гарахыг хамт харъя.'];
}

function Talk() {
  const lines = motherLine();
  return (
    <div className="talk">
      <div className="talk-head">
        <span className="portrait">Э</span>
        <div>
          <div className="eyebrow">Malchin ger — Ээж</div>
          <h3>Ээж</h3>
        </div>
      </div>
      <div className="rule" />
      {lines.map((l, i) => (
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.5 }}>
          {l}
        </motion.p>
      ))}
      <div className="row">
        <button className="primary" onClick={() => useGame.getState().setModal(null)}>
          За, ээж ээ
        </button>
      </div>
    </div>
  );
}

function JournalModal() {
  const steps = useGame((s) => s.steps);
  const questsDone = useGame((s) => s.questsDone);
  const [sel, setSel] = useState<string | null>(null);
  if (sel) return <InfoCard id={sel} onBack={() => setSel(null)} />;
  const learned = Object.keys(INFO).filter((k) => steps[`info.${k}`] || steps[`ger.${k}`]);
  return (
    <div className="info journal">
      <div className="eyebrow">Your journey</div>
      <h3>Аяллын тэмдэглэл</h3>
      <div className="rule" />
      <ol className="journey">
        {QUESTS.map((q, i) => {
          const done = questsDone.includes(q.id);
          const current = !done && activeQuest(questsDone)?.id === q.id;
          return (
            <li key={q.id} className={done ? 'done' : current ? 'now' : ''}>
              <span className="journey-n"><b>{i + 1}</b></span>
              <div>
                <strong>{q.title}</strong>
                <small>{done ? 'Биелсэн' : current ? 'Одоо' : 'Удахгүй'}</small>
              </div>
            </li>
          );
        })}
      </ol>
      <h4>Мэдлэг · {learned.length}/{Object.keys(INFO).length}</h4>
      <div className="items">
        {Object.keys(INFO).map((k) =>
          learned.includes(k) ? (
            <button key={k} className="item" onClick={() => setSel(k)}>
              <Ornament size={14} />
              {INFO[k].title}
            </button>
          ) : (
            <div key={k} className="item locked">
              ? ? ?
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Menu() {
  const soundOn = useGame((s) => s.soundOn);
  const tod = useGame((s) => s.tod);
  const close = () => useGame.getState().setModal(null);
  return (
    <div className="info menu">
      <div className="eyebrow">NOMADVERSE</div>
      <h3>Тохиргоо</h3>
      <div className="rule" />
      <table className="controls">
        <tbody>
          <tr><td><kbd>W A S D</kbd></td><td>Хөдлөх (морьтой үед A/D — эргэх)</td></tr>
          <tr><td><kbd>Shift</kbd></td><td>Гүйх / давхих</td></tr>
          <tr><td>Хулгана чирэх, дугуй</td><td>Камер эргүүлэх, ойртуулах</td></tr>
          <tr><td><kbd>E</kbd></td><td>Харилцах, морь унах/буух, гэрт орох</td></tr>
          <tr><td><kbd>T</kbd> · <kbd>J</kbd></td><td>Өдрийн цаг · Тэмдэглэл</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Тохиргоо</td></tr>
        </tbody>
      </table>
      <div className="row">
        <button className="ghost" onClick={() => useGame.getState().toggleSound()}>{soundOn ? 'Дуу унтраах' : 'Дуу асаах'}</button>
        <button className="ghost" onClick={() => useGame.getState().cycleTod()}>Цаг: {TOD_LABELS[tod]}</button>
        <button className="primary" onClick={close}>Үргэлжлүүлэх</button>
      </div>
    </div>
  );
}

function Modals() {
  const modal = useGame((s) => s.modal);
  const close = () => useGame.getState().setModal(null);
  return (
    <AnimatePresence>
      {modal && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            className={`modal ${modal.type === 'tea' || modal.type === 'journal' ? 'wide' : ''} ${modal.type === 'talk' ? 'talk-modal' : ''}`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <button className="close" onClick={close} aria-label="Хаах">×</button>
            {modal.type === 'info' && <InfoCard id={modal.id} />}
            {modal.type === 'chest' && <Chest />}
            {modal.type === 'tea' && <TeaPanel />}
            {modal.type === 'menu' && <Menu />}
            {modal.type === 'talk' && <Talk />}
            {modal.type === 'journal' && <JournalModal />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- root

export function Overlay() {
  const phase = useGame((s) => s.phase);
  const fading = useGame((s) => s.fading);

  useEffect(
    () =>
      onPress((code) => {
        const s = useGame.getState();
        if (s.phase !== 'play') return;
        if (code === 'Escape') s.setModal(s.modal ? null : { type: 'menu' });
        else if (code === 'KeyT' && !s.modal) s.cycleTod();
        else if (code === 'KeyJ') s.setModal(s.modal?.type === 'journal' ? null : { type: 'journal' });
        else if (code === 'KeyE' && s.modal && (s.modal.type === 'info' || s.modal.type === 'talk')) setTimeout(() => s.setModal(null), 0); // after other E handlers bail
      }),
    []
  );

  return (
    <div className="overlay">
      <Title />
      {phase === 'play' && (
        <>
          <QuestPanel />
          <TopBar />
          <CompassBar />
          <Prompt />
          <Hints />
          <TouchControls />
        </>
      )}
      <Toasts />
      <Modals />
      <div className={`fade ${fading ? 'on' : ''}`} />
    </div>
  );
}
