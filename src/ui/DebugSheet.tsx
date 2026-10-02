import { useState } from 'react';
import type { Engine, Story } from '../engine';
import { SPEEDS, formatDuration, storyLabel } from '../engine';

/** Шторка отладки: время, переменные, прыжки по сценарию, переключение историй. */
export function DebugSheet({
  engine,
  stories,
  storyId,
  onSelectStory,
  onHome,
  onClose,
}: {
  engine: Engine | null;
  stories: Story[];
  storyId: string;
  onSelectStory: (id: string) => void;
  onHome: () => void;
  onClose: () => void;
}) {
  const [, force] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const refresh = () => force((n) => n + 1);
  const view = engine?.view();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Панель отладки">
        <header className="sheet__header">
          <h2 className="sheet__title">Отладка</h2>
          <button className="btn btn--ghost" onClick={onClose}>
            Готово
          </button>
        </header>

        <div className="sheet__group">
          <h3 className="sheet__label">История</h3>
          <select
            className="select"
            value={storyId}
            onChange={(e) => {
              onSelectStory(e.target.value);
              onClose();
            }}
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {storyLabel(s)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={onHome} data-testid="debug-home">
            На главный экран
          </button>
        </div>

        {engine && view && (
          <>
            <div className="sheet__group">
              <h3 className="sheet__label">Время</h3>
              <div className="segmented" role="group" aria-label="Скорость времени">
                {SPEEDS.map((s) => (
                  <button
                    key={String(s)}
                    className="segmented__btn"
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
                className={view.fastTyping ? 'toggle toggle--on' : 'toggle'}
                onClick={() => {
                  engine.setFastTyping(!view.fastTyping);
                  refresh();
                }}
              >
                Быстрый набор (×4): {view.fastTyping ? 'вкл' : 'выкл'}
              </button>
              {view.status ? (
                <p className="sheet__note">
                  Следующее сообщение в чате «{engine.contact(view.status.thread).name}» через{' '}
                  {formatDuration(view.status.pauseMs)} игрового времени (реально{' '}
                  {formatDuration(view.status.realMs)}).
                </p>
              ) : (
                <p className="sheet__note">{view.ended ? 'Сцена закончилась.' : 'Ждём выбор игрока.'}</p>
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

            <div className="sheet__group">
              <h3 className="sheet__label">Переменные</h3>
              {engine.varNames.length === 0 && <p className="sheet__note">В сценарии нет переменных.</p>}
              <ul className="var-list">
                {engine.varNames.map((name) => {
                  const value = engine.getVar(name);
                  return (
                    <li className="var-list__item" key={name}>
                      <span className="var-list__name">{name}</span>
                      {typeof value === 'boolean' ? (
                        <button
                          className={value ? 'toggle toggle--on' : 'toggle'}
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
                          <button
                            className="stepper__btn"
                            onClick={() => {
                              engine.setVar(name, value - 1);
                              refresh();
                            }}
                            aria-label={`Уменьшить ${name}`}
                          >
                            −
                          </button>
                          <span>{value}</span>
                          <button
                            className="stepper__btn"
                            onClick={() => {
                              engine.setVar(name, value + 1);
                              refresh();
                            }}
                            aria-label={`Увеличить ${name}`}
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="sheet__group">
              <h3 className="sheet__label">Перейти к главе</h3>
              <div className="btn-row">
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
                <summary className="sheet__note">Все узлы ({engine.knots.length})</summary>
                <div className="btn-row">
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

            <div className="sheet__group">
              <h3 className="sheet__label">Прогресс</h3>
              {confirmReset ? (
                <div className="confirm">
                  <span>Стереть прогресс этой сцены?</span>
                  <button
                    className="btn btn--danger"
                    onClick={() => {
                      engine.reset();
                      setConfirmReset(false);
                      onClose();
                    }}
                  >
                    Стереть
                  </button>
                  <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                    Отмена
                  </button>
                </div>
              ) : (
                <button className="btn btn--danger" onClick={() => setConfirmReset(true)}>
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
