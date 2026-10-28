'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { activityXp, bonusFor, starsFor, useGame } from '@/game/store';
import { ACTIVITIES, type Step } from '@/game/activities';
import { INFO, ITEMS, masteryLevel } from '@/game/content';
import { audio } from '@/game/audio';

/** A mistake lowers the activity's star rating. */
const miss = () => useGame.getState().miss();

// Plays any activity from game/activities.ts, one step at a time.

/** After a right answer: why it is right, then on to the next step. */
function Insight({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onDone]);
  return (
    <motion.div className="insight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="insight-mark">✓</span>
      <p>{text}</p>
      <button className="primary" onClick={onDone}>
        Цааш <small className="key-hint">Space</small>
      </button>
    </motion.div>
  );
}

function Choice({ step, onDone }: { step: Extract<Step, { kind: 'choice' }>; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  if (insight) return <Insight text={insight} onDone={onDone} />;
  return (
    <>
      <div className="choices">
        {step.options.map((o) => (
          <button
            key={o.label}
            className={`choice ${wrong.includes(o.label) ? 'wrong' : ''}`}
            disabled={wrong.includes(o.label)}
            onClick={() => {
              audio.click();
              if (o.ok) {
                const why = o.after ?? step.after;
                if (why) setInsight(why);
                else onDone();
              } else {
                miss();
                setWrong([...wrong, o.label]);
                setMsg(o.note ?? 'Өөр арга сонгоод үз.');
              }
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {msg && <p className="tea-msg">{msg}</p>}
    </>
  );
}

/** Put the shuffled items into their right order by picking them one after another. */
function Order({ step, onDone }: { step: Extract<Step, { kind: 'order' }>; onDone: () => void }) {
  const shown = useMemo(() => {
    // a fixed shuffle that never starts with the right first item
    const idx = step.items.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (idx[0] === 0) idx.push(idx.shift()!);
    return idx;
  }, [step]);
  const [placed, setPlaced] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (placed >= step.items.length && step.after) return <Insight text={step.after} onDone={onDone} />;
  return (
    <>
      <ol className="order-slots">
        {step.items.map((it, i) => (
          <li key={it} className={i < placed ? 'filled' : i === placed ? 'next' : ''}>
            <b>{i + 1}</b>
            {i < placed ? (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                {it}
              </motion.span>
            ) : (
              <span className="order-blank" />
            )}
          </li>
        ))}
      </ol>
      <div className="choices order-pool">
        {shown.map((i) =>
          i < placed ? null : (
            <motion.button
              key={step.items[i]}
              className="choice"
              animate={shake === i ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              onClick={() => {
                if (i === placed) {
                  audio.tick();
                  setMsg(null);
                  const n = placed + 1;
                  setPlaced(n);
                  if (n >= step.items.length && !step.after) setTimeout(onDone, 400);
                } else {
                  miss();
                  audio.click();
                  setShake(i);
                  setTimeout(() => setShake(null), 360);
                  setMsg(`«${step.items[i]}» арай эрт байна. ${placed + 1}-р алхамд юу хийх ёстойг бод.`);
                }
              }}
            >
              {step.items[i]}
            </motion.button>
          )
        )}
      </div>
      {msg && <p className="tea-msg">{msg}</p>}
    </>
  );
}

function Hold({ step, onDone }: { step: Extract<Step, { kind: 'hold' }>; onDone: () => void }) {
  const [v, setV] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const holding = useRef(false);
  const val = useRef(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (holding.current) {
        val.current = Math.min(1.05, val.current + dt / step.seconds);
        setV(val.current);
        if (!step.zone && val.current >= 1) {
          holding.current = false;
          onDone();
          return;
        }
        if (step.zone && val.current >= 1.05) {
          holding.current = false;
          val.current = 0;
          setV(0);
          miss();
          setMsg('Хэтэрчихлээ — дахин оролдоё.');
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, onDone]);
  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    if (step.zone) {
      if (val.current >= step.zone[0] && val.current <= step.zone[1]) onDone();
      else if (val.current < step.zone[0]) {
        miss();
        setMsg('Арай бага байна — дахин дарж үргэлжлүүл.');
      }
    }
  };
  const press = () => {
    holding.current = true;
    setMsg(null);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        press();
      }
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && release();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });
  return (
    <>
      <div className="meter">
        {step.zone && <div className="meter-zone" style={{ left: `${step.zone[0] * 100}%`, width: `${(step.zone[1] - step.zone[0]) * 100}%` }} />}
        <div className="meter-fill boil" style={{ width: `${Math.min(1, v) * 100}%` }} />
      </div>
      <button className="primary hold" onPointerDown={press} onPointerUp={release} onPointerLeave={release}>
        {step.button} <small className="key-hint">Space</small>
      </button>
      {msg && <p className="tea-msg">{msg}</p>}
    </>
  );
}

function Taps({ step, onDone }: { step: Extract<Step, { kind: 'taps' }>; onDone: () => void }) {
  const [n, setN] = useState(0);
  const count = useRef(0);
  const tap = () => {
    if (count.current >= step.count) return;
    audio.click();
    count.current += 1;
    setN(count.current);
    if (count.current >= step.count) setTimeout(onDone, 250);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <>
      <div className="meter">
        <div className="meter-fill boil" style={{ width: `${(Math.min(n, step.count) / step.count) * 100}%` }} />
      </div>
      <button className="primary" onClick={tap} disabled={n >= step.count}>
        {step.button} ({Math.min(n, step.count)}/{step.count}) <small className="key-hint">Space</small>
      </button>
    </>
  );
}

function Alternate({ step, onDone }: { step: Extract<Step, { kind: 'alternate' }>; onDone: () => void }) {
  const [n, setN] = useState(0);
  const [last, setLast] = useState<'L' | 'R' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const doneRef = useRef(false);
  const hit = (side: 'L' | 'R') => {
    if (n >= step.count || doneRef.current) return;
    if (side === last) {
      miss();
      setMsg('Ээлжлэн дар!');
      return;
    }
    setMsg(null);
    setLast(side);
    audio.bubble();
    const y = n + 1;
    setN(y);
    if (y >= step.count) {
      doneRef.current = true;
      setTimeout(onDone, 300);
    }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') hit('L');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') hit('R');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <>
      <div className="meter">
        <div className="meter-fill water" style={{ width: `${(n / step.count) * 100}%` }} />
      </div>
      <div className="alt-row">
        <button className={`choice alt ${last === 'L' ? 'on' : ''}`} onClick={() => hit('L')}>
          ← {step.left}
        </button>
        <button className={`choice alt ${last === 'R' ? 'on' : ''}`} onClick={() => hit('R')}>
          {step.right} →
        </button>
      </div>
      {msg && <p className="tea-msg">{msg}</p>}
    </>
  );
}

function Wait({ step, onDone }: { step: Extract<Step, { kind: 'wait' }>; onDone: () => void }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (step.seconds * 1000));
      setV(k);
      if (k >= 1) {
        clearInterval(id);
        onDone();
      }
    }, 80);
    return () => clearInterval(id);
  }, [step, onDone]);
  return (
    <div className="meter">
      <div className="meter-fill boil" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** Sewing: the needle runs along the seam; stop it on each stitch mark. */
function Stitch({ step, onDone }: { step: Extract<Step, { kind: 'stitch' }>; onDone: () => void }) {
  const [k, setK] = useState(0);
  const [pos, setPos] = useState(0);
  const [miss, setMiss] = useState(false);
  const posRef = useRef(0);
  const kRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      // ping-pong sweep, a little faster for each stitch
      const sp = 0.45 + kRef.current * 0.04;
      const u = (((now - t0) / 1000) * sp) % 2;
      posRef.current = u < 1 ? u : 2 - u;
      setPos(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const marks = Array.from({ length: step.count }, (_, i) => 0.08 + (i / (step.count - 1)) * 0.84);
  const press = () => {
    if (kRef.current >= step.count) return;
    if (Math.abs(posRef.current - marks[kRef.current]) < 0.045) {
      audio.tick();
      kRef.current += 1;
      setK(kRef.current);
      setMiss(false);
      if (kRef.current >= step.count) setTimeout(onDone, 350);
    } else {
      setMiss(true);
      useGame.getState().miss();
      audio.click();
    }
  };
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  });
  return (
    <>
      <div className={`seam ${miss ? 'miss' : ''}`}>
        {marks.map((m, i) => (
          <span key={i} className={`stitch-mark ${i < k ? 'sewn' : i === k ? 'next' : ''}`} style={{ left: `${m * 100}%` }} />
        ))}
        {marks.slice(0, Math.max(0, k - 1)).map((m, i) => (
          <span key={`t${i}`} className="thread-line" style={{ left: `${m * 100}%`, width: `${(marks[i + 1] - m) * 100}%` }} />
        ))}
        <span className="needle" style={{ left: `${pos * 100}%` }} />
      </div>
      <button className="primary" onClick={press}>
        Хатгах ({k}/{step.count}) <small className="key-hint">Space</small>
      </button>
      {miss && <p className="tea-msg">Тэмдэг дээр ирэхэд нь дар.</p>}
    </>
  );
}

const VERDICT = ['', 'Дадлага хэрэгтэй', 'Сайн байна', 'Онц! Алдаагүй'];

function Stars({ n }: { n: number }) {
  return (
    <div className="stars" aria-label={`${n}/3 од`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={i < n ? 'on' : ''}
          initial={{ scale: 0, rotate: -40, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.22, type: 'spring', stiffness: 320, damping: 14 }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}

/** Craft level and how far to the next one. */
function MasteryBar({ id }: { id: string }) {
  const m = useGame((s) => s.mastery[id]);
  const times = m?.times ?? 0;
  const lv = masteryLevel(times);
  const prevMin = [0, 1, 3, 6, 10][lv.index];
  const k = lv.next ? (times - prevMin) / (lv.next.min - prevMin) : 1;
  return (
    <div className="mastery">
      <div className="mastery-head">
        <span>
          Ур чадвар: <b>{lv.label}</b>
        </span>
        <small>{lv.next ? `${lv.next.label} болоход ${lv.next.min - times} удаа` : 'Дээд түвшин'}</small>
      </div>
      <div className="meter thin">
        <motion.div className="meter-fill gold" initial={{ width: 0 }} animate={{ width: `${k * 100}%` }} transition={{ delay: 0.9, duration: 0.8 }} />
      </div>
    </div>
  );
}

export function ActivityPanel() {
  const activity = useGame((s) => s.activity);
  const next = useGame((s) => s.activityNext);
  const cancel = useGame((s) => s.cancelActivity);
  const misses = useGame((s) => s.misses);
  if (!activity) return null;
  const def = ACTIVITIES[activity.id];
  const finished = activity.step >= def.steps.length;
  const step = def.steps[Math.min(activity.step, def.steps.length - 1)];
  return (
    <div className="tea activity">
      <div className="eyebrow">{def.latin}</div>
      <h3>{def.title}</h3>
      <ol className="tea-steps">
        {def.steps.map((st, i) => (
          <li key={i} className={i < activity.step ? 'done' : i === activity.step ? 'now' : ''}>
            {st.title}
          </li>
        ))}
      </ol>
      <div className="tea-body">
        {finished ? (
          <>
            <Stars n={starsFor(misses)} />
            <p className="verdict">{VERDICT[starsFor(misses)]}</p>
            <p className="tea-done">{def.outro}</p>
            <div className="reward-row">
              {Object.entries(def.gives).map(([k, n]) => (
                <span key={k} className="reward">
                  <i style={{ background: ITEMS[k]?.color }} />
                  {ITEMS[k]?.name} ×{n}
                </span>
              ))}
              {Object.entries(bonusFor(def.id, starsFor(misses))).map(([k, n]) => (
                <span key={`b${k}`} className="reward bonus">
                  <i style={{ background: ITEMS[k]?.color }} />
                  Онцын шагнал: {ITEMS[k]?.name} +{n}
                </span>
              ))}
              <span className="reward xp">+{activityXp(def.xp, starsFor(misses))} XP</span>
            </div>
            <div className="meaning">
              <div className="eyebrow">Цаад утга</div>
              <p>{def.meaning}</p>
              {def.blessing && <p className="blessing">«{def.blessing}»</p>}
            </div>
            <MasteryBar id={def.id} />
            <div className="row">
              {def.knowledge.map((id) => (
                <button key={id} className="ghost" onClick={() => useGame.getState().setModal({ type: 'info', id })}>
                  {INFO[id]?.title}
                </button>
              ))}
              <button className="primary" onClick={cancel}>
                Болсон
              </button>
            </div>
          </>
        ) : (
          <>
            {activity.step === 0 && <p className="intro">{def.intro}</p>}
            <h4 className="step-title">{step.title}</h4>
            <p>{step.text}</p>
            {/* key on the step index remounts the widget for each step */}
            {step.kind === 'choice' && <Choice key={activity.step} step={step} onDone={next} />}
            {step.kind === 'hold' && <Hold key={activity.step} step={step} onDone={next} />}
            {step.kind === 'taps' && <Taps key={activity.step} step={step} onDone={next} />}
            {step.kind === 'alternate' && <Alternate key={activity.step} step={step} onDone={next} />}
            {step.kind === 'wait' && <Wait key={activity.step} step={step} onDone={next} />}
            {step.kind === 'stitch' && <Stitch key={activity.step} step={step} onDone={next} />}
            {step.kind === 'order' && <Order key={activity.step} step={step} onDone={next} />}
            <div className="row">
              <button className="ghost" onClick={cancel}>
                Болих
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
