import { useState } from 'react';
import type { Engine, LogEntry, Story } from '../engine';
import { SPEEDS, downloadChoiceLog, formatDuration, formatTime, storyLabel } from '../engine';

/** Сколько последних записей журнала видно в шторке: остальное — в выгрузке. */
const LOG_SHOWN = 5;

function logWhat(e: LogEntry): string {
  if (e.kind === 'choice') return `«${e.text}»`;
  if (e.kind === 'noanswer') return e.reminders ? `не ответил после напоминаний: ${e.reminders}` : 'не ответил';
  if (e.kind === 'remind') return `напоминание: «${e.text}»`;
  if (e.kind === 'jump') return `отладка: переход к «${e.text}»`;
  return `отладка: ${e.text}`;
}

/** Шторка отладки: время, переменные, журнал выборов, прыжки по сценарию, переключение историй. */
export function DebugSheet({
  engine,
  stories,
  storyId,
  onSelectStory,
  onHome,
  onClose,
  freeChapters,
  chaptersOpen,
  onChaptersOpen,
}: {
  engine: Engine | null;
  stories: Story[];
  storyId: string;
  onSelectStory: (id: string) => void;
  onHome: () => void;
  onClose: () => void;
  /** Сколько глав бесплатно; null — у истории нет платной границы. */
  freeChapters: number | null;
  chaptersOpen: boolean;
  onChaptersOpen: (open: boolean) => void;
}) {
  const [, force] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const refresh = () => force((n) => n + 1);
  const view = engine?.view();
  const log = engine?.journal() ?? [];
  const story = stories.find((s) => s.id === storyId);

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
              <p className="sheet__note">
                Режим: {view.mode === 'click' ? 'по клику — пауз нет' : 'реальное время'}. Сменить — только перезапуском
                с экрана истории.
              </p>
              {view.mode === 'realtime' && (
                <div className="segmented" role="group" aria-label="Скорость пауз (отладка)">
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
              )}
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
              ) : view.silence ? (
                <p className="sheet__note">
                  Ждём выбор игрока. Если он молчит, через {formatDuration(view.silence.leftMs)}{' '}
                  {view.silence.remind ? 'персонаж напомнит' : 'история пойдёт веткой «не ответил»'}
                  {view.silence.manual ? ' (без пауз — только по кнопке ниже).' : ' (настоящее время, ускорение на него не действует).'}
                </p>
              ) : (
                <p className="sheet__note">
                  {view.locked ? 'История стоит на платной границе.' : view.ended ? 'Сцена закончилась.' : 'Ждём выбор игрока.'}
                </p>
              )}
              <button
                className="btn"
                disabled={!view.status && !view.silence}
                onClick={() => {
                  engine.skipNext();
                  refresh();
                }}
                data-testid="skip-next"
              >
                Пропустить до следующего
              </button>
            </div>

            {freeChapters !== null && (
              <div className="sheet__group">
                <h3 className="sheet__label">Платные главы</h3>
                <p className="sheet__note">
                  Бесплатно глав: {freeChapters}. Покупки пока нет: продолжение открывается здесь, для этой истории
                  и до выключения — «начать заново» его не закрывает.
                  {view.locked ? ' Сейчас история стоит на границе.' : ''}
                </p>
                <button
                  className={chaptersOpen ? 'toggle toggle--on' : 'toggle'}
                  aria-pressed={chaptersOpen}
                  onClick={() => {
                    onChaptersOpen(!chaptersOpen);
                    refresh();
                  }}
                  data-testid="chapters-open"
                >
                  Все главы открыты: {chaptersOpen ? 'да' : 'нет'}
                </button>
              </div>
            )}

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
              <h3 className="sheet__label">Журнал выборов</h3>
              <p className="sheet__note">
                {log.length
                  ? `Записей: ${log.length}. Выгрузка — файл для автора: маршрут повторяет npm run story:trace -- --from-save.`
                  : 'Выборов пока не было.'}
              </p>
              {log.length > 0 && (
                <ol className="choice-log" data-testid="choice-log">
                  {log
                    .map((e, i) => ({ e, n: i + 1 }))
                    .slice(-LOG_SHOWN)
                    .reverse()
                    .map(({ e, n }) => (
                      <li className="choice-log__item" key={n}>
                        <span className="choice-log__where">
                          {n} · {e.knot ?? 'до первого узла'} · {formatTime(e.at)}
                          {e.kind === 'choice' || e.kind === 'noanswer' ? ` · ждал ${formatDuration(e.waitMs)}` : ''}
                        </span>
                        <span className={e.kind === 'choice' ? 'choice-log__what' : 'choice-log__what choice-log__what--quiet'}>
                          {logWhat(e)}
                        </span>
                      </li>
                    ))}
                </ol>
              )}
              <button
                className="btn"
                disabled={!log.length}
                onClick={() => downloadChoiceLog(engine, story ?? { id: storyId, title: engine.title })}
                data-testid="choice-log-export"
              >
                Скачать журнал
              </button>
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
