'use client';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/game/store';
import { ACTIVITIES, type Step } from '@/game/activities';
import { INFO, ITEMS } from '@/game/content';
import { audio } from '@/game/audio';

// Plays any activity from game/activities.ts, one step at a time.

function Choice({ step, onDone }: { step: Extract<Step, { kind: 'choice' }>; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <div className="choices">
        {step.options.map((o) => (
          <button
            key={o.label}
            className="choice"
            onClick={() => {
              audio.click();
              if (o.ok) onDone();
              else setMsg(o.note ?? 'Өөр арга сонгоод үз.');
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
      else if (val.current < step.zone[0]) setMsg('Арай бага байна — дахин дарж үргэлжлүүл.');
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

export function ActivityPanel() {
  const activity = useGame((s) => s.activity);
  const next = useGame((s) => s.activityNext);
  const cancel = useGame((s) => s.cancelActivity);
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
            <p className="tea-done">{def.outro}</p>
            <div className="reward-row">
              {Object.entries(def.gives).map(([k, n]) => (
                <span key={k} className="reward">
                  <i style={{ background: ITEMS[k]?.color }} />
                  {ITEMS[k]?.name} ×{n}
                </span>
              ))}
              <span className="reward xp">+{def.xp} XP</span>
            </div>
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
