import { useState } from 'react';
import { CONTACT_COLORS, downloadStory, sizeLabel, storyPalette, formatAgo } from '../engine';
import type { Progress, Story } from '../engine';
import { Avatar } from './Avatar';

/**
 * Экран истории: о чём, как играется, герои, главы. Отсюда её запускают.
 * Он же витрина для автора: загрузил свой файл — сразу видно, как он будет выглядеть.
 */
export function StoryScreen({
  story,
  progress,
  onPlay,
  onBack,
  onReset,
  onDelete,
}: {
  story: Story;
  progress: Progress | null;
  onPlay: () => void;
  onBack: () => void;
  onReset: () => void;
  /** Есть только у загруженных историй: встроенную из репозитория не удалить. */
  onDelete?: () => void;
}) {
  const [confirm, setConfirm] = useState<null | 'reset' | 'delete'>(null);
  const palette = storyPalette(story.ink);

  const cta = !progress ? 'Начать' : progress.ended ? 'Пройти заново' : 'Продолжить';
  const where = progress
    ? progress.ended
      ? 'История пройдена'
      : `${progress.chapter || `${progress.messages} сообщений`} · ${formatAgo(progress.savedAt)}`
    : sizeLabel(story.chapters?.length, story.minutes);

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
          <button className="btn btn--primary" onClick={onPlay} data-testid="play">
            {cta} →
          </button>
          <span className="story__where">{where}</span>
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

        {!!story.characters?.length && (
          <section className="info">
            <h2 className="info__title">Герои</h2>
            <ul className="people">
              {story.characters.map((c) => (
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
                <li className="chapters__item" key={ch.title}>
                  <span className="chapters__no">{i + 1}</span>
                  <span className="chapters__body">
                    <span className="chapters__top">
                      <span className="chapters__title">{ch.title}</span>
                      {ch.when && <span className="chapters__when">{ch.when}</span>}
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
            {progress && (
              <button className="btn btn--danger" onClick={() => setConfirm('reset')}>
                Начать заново
              </button>
            )}
            {onDelete && (
              <button className="btn btn--danger" onClick={() => setConfirm('delete')} data-testid="delete-story">
                Удалить историю
              </button>
            )}
          </div>

          {confirm === 'reset' && (
            <div className="confirm">
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
          )}
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
