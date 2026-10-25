import { useState } from 'react';
import {
  CONTACT_COLORS,
  DEFAULT_MODE,
  MODES,
  downloadStory,
  formatAgo,
  freeLine,
  isOutdated,
  modeSizes,
  revisionOf,
  sizeLabel,
  storyPalette,
  storyPeople,
} from '../engine';
import type { Mode, Progress, Story } from '../engine';
import { Avatar } from './Avatar';
import { RevisionNotice } from './RevisionNotice';

const MODE_TEXT: Record<Mode, { name: string; hint: string }> = {
  realtime: { name: 'Реальное время', hint: 'паузы настоящие, сообщения приходят сами' },
  click: { name: 'По клику', hint: 'без ожиданий: следующее приходит сразу' },
};

/**
 * Экран истории: о чём, как играется, герои, главы. Отсюда её запускают.
 * Он же витрина для автора: загрузил свой файл — сразу видно, как он будет выглядеть.
 */
export function StoryScreen({
  story,
  progress: saved,
  free,
  onPlay,
  onBack,
  onReset,
  onDelete,
}: {
  story: Story;
  progress: Progress | null;
  /** Сколько глав бесплатно, пока продолжение закрыто; null — закрытых глав нет. */
  free: number | null;
  /** Режим важен только новой игре: начатая продолжается в своём. */
  onPlay: (mode: Mode) => void;
  onBack: () => void;
  onReset: () => void;
  /** Есть только у загруженных историй: встроенную из репозитория не удалить. */
  onDelete?: () => void;
}) {
  // сохранение от другой ревизии не продолжить: экран ведёт себя как до начала игры и предупреждает
  const outdated = isOutdated(saved, story);
  const progress = outdated ? null : saved;
  const [confirm, setConfirm] = useState<null | 'reset' | 'delete' | Mode>(null);
  const [picked, setPicked] = useState<Mode>(saved?.mode ?? DEFAULT_MODE);
  // начатая игра идёт в своём режиме: другой включается только перезапуском
  const mode = progress?.mode ?? picked;
  const sizes = modeSizes(story);
  const palette = storyPalette(story.ink);
  const people = storyPeople(story);

  const cta = !progress ? 'Начать' : progress.ended ? 'Пройти заново' : 'Продолжить';
  const where = progress
    ? progress.ended
      ? 'История пройдена'
      : progress.locked && free !== null
        ? `Бесплатные главы пройдены · ${formatAgo(progress.savedAt)}`
        : `${progress.chapter || `${progress.messages} сообщений`} · ${formatAgo(progress.savedAt)}`
    : sizeLabel(story);

  return (
    <div className="screen screen--scroll" data-testid="story">
      <header
        className="story__cover"
        style={{
          ['--cover-from' as string]: story.cover.from,
          ['--cover-to' as string]: story.cover.to,
        }}
      >
        <div className="screen__bar">
          <button className="btn btn--back btn--on-cover" onClick={onBack} data-testid="story-back">
            ← Истории
          </button>
        </div>
        <span className="story__glyph" aria-hidden="true">
          {story.cover.glyph}
        </span>
        {story.series && <span className="story__kicker">{story.series}</span>}
        <h1 className="story__title">{story.title}</h1>
        <p className="story__tagline">{story.tagline}</p>
      </header>

      <div className="story__body">
        <div className="story__play">
          <div className="mode-picker" role="radiogroup" aria-label="Режим игры">
            {MODES.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                className={mode === m ? 'mode-picker__option mode-picker__option--active' : 'mode-picker__option'}
                onClick={() => (m === mode ? setConfirm(null) : progress ? setConfirm(m) : setPicked(m))}
                data-testid={`mode-${m}`}
              >
                <span className="mode-picker__name">{MODE_TEXT[m].name}</span>
                {sizes[m] && (
                  <span className={mode === m ? 'mode-picker__size mode-picker__size--active' : 'mode-picker__size'}>
                    {sizes[m]}
                  </span>
                )}
                <span className="mode-picker__hint">{MODE_TEXT[m].hint}</span>
              </button>
            ))}
          </div>
          {confirm === 'realtime' || confirm === 'click' ? (
            <div className="confirm confirm--center">
              <span>Режим меняется только с начала: прогресс сотрётся.</span>
              <button
                className="btn btn--danger"
                onClick={() => {
                  onReset();
                  setPicked(confirm);
                  setConfirm(null);
                }}
                data-testid="mode-confirm"
              >
                Начать заново
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Отмена
              </button>
            </div>
          ) : null}
          {outdated && saved && <RevisionNotice from={saved.revision} to={revisionOf(story)} done={false} />}
          <button
            className="btn btn--primary"
            onClick={() => {
              if (outdated) onReset();
              onPlay(mode);
            }}
            data-testid="play"
          >
            {cta} →
          </button>
          {progress &&
            (confirm === 'reset' ? (
              <div className="confirm confirm--center">
                <span>Стереть прогресс?</span>
                <button
                  className="btn btn--danger"
                  onClick={() => {
                    onReset();
                    setConfirm(null);
                  }}
                >
                  Стереть
                </button>
                <button className="btn btn--ghost" onClick={() => setConfirm(null)}>
                  Отмена
                </button>
              </div>
            ) : (
              <button
                className="btn btn--ghost btn--quiet"
                onClick={() => setConfirm('reset')}
                data-testid="reset"
              >
                Сбросить прогресс
              </button>
            ))}
          <span className="story__where">{where}</span>
          {free !== null && (
            <span className="story__free" data-testid="free-chapters">
              {freeLine(free, story.chapters?.length)}
            </span>
          )}
        </div>

        {story.synopsis && (
          <section className="info">
            <h2 className="info__title">О чём</h2>
            <p className="info__text">{story.synopsis}</p>
          </section>
        )}

        {!!story.features?.length && (
          <section className="info">
            <h2 className="info__title">Как это играется</h2>
            <ul className="feature-list">
              {story.features.map((f) => (
                <li className="feature-list__item" key={f}>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!people.length && (
          <section className="info">
            <h2 className="info__title">Герои</h2>
            <ul className="people">
              {people.map((c) => (
                <li className="people__item" key={c.name}>
                  <Avatar
                    contact={{
                      id: c.id ?? c.name,
                      name: c.name,
                      color: c.color ?? (c.id ? palette[c.id] : undefined) ?? CONTACT_COLORS.grey,
                    }}
                    size={40}
                  />
                  <span className="people__body">
                    <span className="people__top">
                      <span className="people__name">{c.name}</span>
                      <span className="people__role">{c.role}</span>
                    </span>
                    {c.about && <span className="people__about">{c.about}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!story.chapters?.length && (
          <section className="info">
            <h2 className="info__title">Главы</h2>
            <ol className="chapters">
              {story.chapters.map((ch, i) => (
                <li
                  className={free !== null && i >= free ? 'chapters__item chapters__item--locked' : 'chapters__item'}
                  key={ch.title}
                  data-testid={free !== null && i >= free ? 'chapter-locked' : undefined}
                >
                  <span className="chapters__no">{i + 1}</span>
                  <span className="chapters__body">
                    <span className="chapters__top">
                      <span className="chapters__title">{ch.title}</span>
                      {ch.when && <span className="chapters__when">{ch.when}</span>}
                      {free !== null && i >= free && <span className="chapters__lock">платно</span>}
                    </span>
                    {ch.about && <span className="chapters__about">{ch.about}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="info info--separated">
          <h2 className="info__title">Файл истории</h2>
          <p className="info__text info__text--muted">
            Один .json: описание, герои, главы и сценарий. Можно выгрузить, поправить и загрузить обратно.
          </p>
          <div className="btn-row">
            <button className="btn" onClick={() => downloadStory(story)} data-testid="export">
              Скачать .json
            </button>
            {onDelete && (
              <button className="btn btn--danger" onClick={() => setConfirm('delete')} data-testid="delete-story">
                Удалить историю
              </button>
            )}
          </div>

          {confirm === 'delete' && (
            <div className="confirm">
              <span>Убрать историю из приложения?</span>
              <button className="btn btn--danger" onClick={onDelete}>
                Удалить
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Отмена
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
