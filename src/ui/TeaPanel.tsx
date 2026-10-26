'use client';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/game/store';
import { audio } from '@/game/audio';

// Сүүтэй цай: a short, state-driven mini game. The 3D pot on the stove mirrors
// the same `tea` state (water level, colour, steam, ladle animation, cups).

const STEP_TITLES = ['Тогоо сонгох', 'Ус хийх', 'Буцалгах', 'Цай хийх', 'Сүү, давс', 'Самрах', 'Аягалах', 'Бэлэн'];
const ZONE: [number, number] = [0.6, 0.85];

function Choice({ options, onPick }: { options: { id: string; label: string; note: string; ok: boolean }[]; onPick: (id: string) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <div className="choices">
        {options.map((o) => (
          <button
            key={o.id}
            className="choice"
            onClick={() => {
              audio.click();
              if (o.ok) onPick(o.id);
              else setMsg(o.note);
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

export function TeaPanel() {
  const tea = useGame((s) => s.tea);
  const update = useGame((s) => s.updateTea);
  const [msg, setMsg] = useState<string | null>(null);
  const pouring = useRef<number | null>(null);

  // boiling runs on its own
  useEffect(() => {
    if (tea.step !== 2) return;
    const id = setInterval(() => {
      const b = useGame.getState().tea.boil;
      if (Math.random() < 0.5) audio.bubble();
      if (b >= 1) clearInterval(id);
      else update({ boil: Math.min(1, b + 0.03) });
    }, 100);
    return () => clearInterval(id);
  }, [tea.step, update]);

  useEffect(() => () => stopPour(), []);

  const startPour = () => {
    if (pouring.current) return;
    audio.pour();
    pouring.current = window.setInterval(() => {
      const w = useGame.getState().tea.water;
      update({ water: Math.min(1, w + 0.012) });
      if (w >= 1) stopPour();
    }, 30);
  };
  function stopPour() {
    if (pouring.current) {
      clearInterval(pouring.current);
      pouring.current = null;
    }
  }
  const releasePour = () => {
    stopPour();
    const w = useGame.getState().tea.water;
    if (w > ZONE[1]) {
      setMsg('Хэт дүүрчихлээ — буцалгахад халина. Дахин хэмжээгээ тааруулъя.');
      update({ water: 0 });
    } else if (w >= ZONE[0]) {
      setMsg(null);
      update({ step: 2 });
    }
  };

  const step = tea.step;
  return (
    <div className="tea">
      <div className="eyebrow">Suutei tsai — milk tea</div>
      <h3>Сүүтэй цай чанах</h3>
      <ol className="tea-steps">
        {STEP_TITLES.slice(0, 7).map((t, i) => (
          <li key={t} className={i < step ? 'done' : i === step ? 'now' : ''}>
            {t}
          </li>
        ))}
      </ol>

      <div className="tea-body">
        {step === 0 && (
          <>
            <p>Монгол айлд цайг ихэвчлэн зуухан дээрх том тогоонд чанадаг. Аль савыг сонгох вэ?</p>
            <Choice
              options={[
                { id: 'pot', label: 'Ширмэн тогоо', note: '', ok: true },
                { id: 'cup', label: 'Шаазан аяга', note: 'Аягаар цай уудаг, харин чанахад бага.', ok: false },
                { id: 'bucket', label: 'Хувин', note: 'Хувинаар ус зөөдөг — гал дээр тавьдаггүй.', ok: false },
              ]}
              onPick={() => update({ step: 1 })}
            />
          </>
        )}

        {step === 1 && (
          <>
            <p>Товчийг дарж ус хийнэ. Шар бүсэд хүрмэгц тавь.</p>
            <div className="meter">
              <div className="meter-zone" style={{ left: `${ZONE[0] * 100}%`, width: `${(ZONE[1] - ZONE[0]) * 100}%` }} />
              <div className="meter-fill water" style={{ width: `${tea.water * 100}%` }} />
            </div>
            <button
              className="primary hold"
              onPointerDown={startPour}
              onPointerUp={releasePour}
              onPointerLeave={() => pouring.current && releasePour()}
            >
              Дарж ус хийх
            </button>
            {msg && <p className="tea-msg">{msg}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <p>Аргалын гал дээр ус буцалж байна…</p>
            <div className="meter">
              <div className="meter-fill boil" style={{ width: `${tea.boil * 100}%` }} />
            </div>
            <button className="primary" disabled={tea.boil < 1} onClick={() => update({ step: 3 })}>
              {tea.boil < 1 ? 'Түр хүлээ' : 'Ус буцаллаа →'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <p>Буцалсан усанд юу хийх вэ?</p>
            <Choice
              options={[
                { id: 'tea', label: 'Шахмал ногоон цай', note: '', ok: true },
                { id: 'coffee', label: 'Кофе', note: 'Сүүтэй цайнд шахмал цайг хэрчиж, нүдэж хийдэг.', ok: false },
                { id: 'sugar', label: 'Элсэн чихэр', note: 'Монгол сүүтэй цайг ихэвчлэн чихэргүй, давстай уудаг.', ok: false },
              ]}
              onPick={() => {
                audio.bubble();
                update({ step: 4, added: ['tea'] });
              }}
            />
          </>
        )}

        {step === 4 && (
          <>
            <p>Цай өнгөө гаргасны дараа сүүгээ хийнэ. Давс, бусад орцыг нутаг, айлын заншлаар нэмдэг.</p>
            <div className="toggles">
              {[
                { id: 'milk', label: 'Сүү', hint: 'заавал' },
                { id: 'salt', label: 'Давс', hint: 'бага зэрэг' },
                { id: 'butter', label: 'Цөцгийн тос', hint: 'зарим нутагт' },
              ].map((o) => {
                const on = tea.added.includes(o.id);
                return (
                  <button
                    key={o.id}
                    className={`toggle ${on ? 'on' : ''}`}
                    onClick={() => {
                      audio.click();
                      update({ added: on ? tea.added.filter((x) => x !== o.id) : [...tea.added, o.id] });
                    }}
                  >
                    {o.label}
                    <small>{o.hint}</small>
                  </button>
                );
              })}
            </div>
            <button
              className="primary"
              disabled={!tea.added.includes('milk')}
              onClick={() => {
                audio.pour();
                update({ step: 5 });
              }}
            >
              {tea.added.includes('milk') ? 'Үргэлжлүүлэх →' : 'Сүүгээ нэмээрэй'}
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <p>Шанагаар цайгаа утгаж, өндрөөс буцааж цутгана — цай агааржиж, амт нь зөөлөрнө.</p>
            <div className="meter">
              <div className="meter-fill boil" style={{ width: `${(tea.ladles / 5) * 100}%` }} />
            </div>
            <button
              className="primary"
              onClick={() => {
                audio.pour();
                const ladles = tea.ladles + 1;
                update({ ladles });
                if (ladles >= 5) {
                  setTimeout(() => {
                    update({ step: 6 });
                    useGame.getState().complete('tea', 'brew');
                  }, 600);
                }
              }}
              disabled={tea.ladles >= 5}
            >
              Самрах ({tea.ladles}/5)
            </button>
          </>
        )}

        {step === 6 && (
          <>
            <p>Цайгаа аягалъя. Эхний аягыг буюу дээжийг ахмад хүн, эсвэл хойморт барьдаг заншилтай.</p>
            <div className="cups">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className={`cup ${tea.cups > i ? 'full' : ''}`}
                  disabled={tea.cups !== i}
                  onClick={() => {
                    audio.pour();
                    const cups = tea.cups + 1;
                    update({ cups });
                    if (cups >= 3) {
                      setTimeout(() => {
                        update({ step: 7 });
                        useGame.getState().complete('tea', 'serve');
                      }, 500);
                    }
                  }}
                >
                  <span className="cup-fill" />
                  {i === 0 ? 'Дээж' : `${i + 1}-р аяга`}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <p className="tea-done">Халуун сүүтэй цай бэлэн боллоо. Аяга цайгаа баруун гараараа, эсвэл хоёр гараараа барьж өгөөрэй.</p>
            <div className="row">
              <button className="ghost" onClick={() => useGame.getState().resetTea()}>
                Дахин чанах
              </button>
              <button className="primary" onClick={() => useGame.getState().setModal(null)}>
                Болсон
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
