import { useRef, useState } from 'react';
import { Engine, SPEEDS, formatDuration } from '../engine/engine';
import { STORIES } from '../stories';

export function DebugSheet({
  engine,
  storyId,
  hasCustom,
  onSelectStory,
  onUpload,
  onClose,
}: {
  engine: Engine | null;
  storyId: string;
  hasCustom: boolean;
  onSelectStory: (id: string) => void;
  onUpload: (source: string) => void;
  onClose: () => void;
}) {
  const [, force] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => force((n) => n + 1);
  const view = engine?.view();

  const readFile = (file: File) => {
    file.text().then((text) => {
      onUpload(text);
      onClose();
    });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Панель отладки">
        <header className="sheet-header">
          <h2>Отладка</h2>
          <button className="btn ghost" onClick={onClose}>
            Готово
          </button>
        </header>

        <div className="sheet-group">
          <h3>Сценарий</h3>
          <select
            id="story-select"
            value={storyId}
            onChange={(e) => {
              onSelectStory(e.target.value);
              onClose();
            }}
          >
            {STORIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
            {hasCustom && <option value="custom">Загруженный .ink</option>}
          </select>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Загрузить свой .ink
          </button>
          <input
            ref={fileRef}
            id="ink-file"
            type="file"
            accept=".ink,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
            }}
          />
        </div>

        {engine && view && (
          <>
            <div className="sheet-group">
              <h3>Время</h3>
              <div className="segmented" role="group" aria-label="Скорость времени">
                {SPEEDS.map((s) => (
                  <button
                    key={String(s)}
                    aria-pressed={view.speed === s}
                    onClick={() => {
                      engine.setSpeed(s);
                      refresh();
                    }}
                  >
                    {s === Infinity ? 'без пауз' : `×${s}`}
                  </button>
                ))}
              </div>
              <button
                className={view.fastTyping ? 'toggle on' : 'toggle'}
                onClick={() => {
                  engine.setFastTyping(!view.fastTyping);
                  refresh();
                }}
              >
                Быстрый набор (×4): {view.fastTyping ? 'вкл' : 'выкл'}
              </button>
              {view.status ? (
                <p className="muted">
                  Следующее сообщение в чате «{engine.contact(view.status.thread).name}» через{' '}
                  {formatDuration(view.status.pauseMs)} игрового времени (реально {formatDuration(view.status.realMs)}).
                </p>
              ) : (
                <p className="muted">{view.ended ? 'Сцена закончилась.' : 'Ждём выбор игрока.'}</p>
              )}
              <button
                className="btn"
                disabled={!view.status}
                onClick={() => {
                  engine.skipWait();
                  refresh();
                }}
              >
                Пропустить ожидание
              </button>
            </div>

            <div className="sheet-group">
              <h3>Переменные</h3>
              {engine.varNames.length === 0 && <p className="muted">В сценарии нет переменных.</p>}
              <ul className="vars">
                {engine.varNames.map((name) => {
                  const value = engine.getVar(name);
                  return (
                    <li key={name}>
                      <span className="var-name">{name}</span>
                      {typeof value === 'boolean' ? (
                        <button
                          className={value ? 'toggle on' : 'toggle'}
                          aria-pressed={value}
                          onClick={() => {
                            engine.setVar(name, !value);
                            refresh();
                          }}
                        >
                          {value ? 'true' : 'false'}
                        </button>
                      ) : typeof value === 'number' ? (
                        <span className="stepper">
                          <button onClick={() => { engine.setVar(name, value - 1); refresh(); }} aria-label={`Уменьшить ${name}`}>−</button>
                          <span>{value}</span>
                          <button onClick={() => { engine.setVar(name, value + 1); refresh(); }} aria-label={`Увеличить ${name}`}>+</button>
                        </span>
                      ) : (
                        <span className="var-value">{String(value)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="sheet-group">
              <h3>Перейти к главе</h3>
              <div className="knots">
                {engine.knots
                  .filter((k) => /^ch\d+$/.test(k))
                  .map((k) => (
                    <button
                      key={k}
                      className="chip"
                      onClick={() => {
                        engine.jump(k);
                        onClose();
                      }}
                    >
                      Глава {k.slice(2)}
                    </button>
                  ))}
              </div>
              <details>
                <summary className="muted">Все узлы ({engine.knots.length})</summary>
                <div className="knots">
                  {engine.knots.map((k) => (
                    <button
                      key={k}
                      className="chip"
                      onClick={() => {
                        engine.jump(k);
                        onClose();
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <div className="sheet-group">
              <h3>Прогресс</h3>
              {confirmReset ? (
                <div className="confirm">
                  <span>Стереть прогресс этой сцены?</span>
                  <button
                    className="btn danger"
                    onClick={() => {
                      engine.reset();
                      setConfirmReset(false);
                      onClose();
                    }}
                  >
                    Стереть
                  </button>
                  <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                    Отмена
                  </button>
                </div>
              ) : (
                <button className="btn danger" onClick={() => setConfirmReset(true)}>
                  Начать сцену заново
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
