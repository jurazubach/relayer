import type { Progress, Story } from '../engine';
import { formatAgo, isOutdated, keepShortWords, storyCounts, storyTeasers, timeLines } from '../engine';

/**
 * Карточка истории на главном экране: на всю ширину, обложкой.
 * Порядок — то, что игрок решает за три секунды: о чём (название и логлайн),
 * чем зацепит (затравки пузырями, как входящие), сколько займёт (главы, герои, время).
 * Начатая история вместо затравок показывает, где игрок остановился: зачем начинать, он уже знает.
 */
export function StoryTile({
  story,
  progress: saved,
  onOpen,
}: {
  story: Story;
  progress: Progress | null;
  onOpen: () => void;
}) {
  // сохранение от прошлой ревизии сценария не продолжить: карточка как у новой истории
  const outdated = isOutdated(saved, story);
  const progress = outdated ? null : saved;
  const counts = storyCounts(story);
  const teasers = progress ? [] : storyTeasers(story);
  const time = timeLines(story);
  const state = !progress
    ? null
    : progress.ended
      ? 'Пройдено'
      : progress.chapter || `${progress.messages} сообщений`;
  const ago = progress && !progress.ended && progress.savedAt ? formatAgo(progress.savedAt) : '';
  const own = story.origin === 'upload';
  const going = !!progress && !progress.ended;

  return (
    <li
      className="story-tile is-rising"
      style={{
        ['--cover-from' as string]: story.cover.from,
        ['--cover-to' as string]: story.cover.to,
      }}
    >
      <button className="story-tile__open" onClick={onOpen} data-testid={`tile-${story.id}`}>
        <span className="story-tile__glyph" aria-hidden="true">
          {story.cover.glyph}
        </span>

        <span className="story-tile__head">
          <span className="story-tile__kicker">{story.series}</span>
          {(counts.length > 0 || own) && (
            <span className="story-tile__counts" data-testid={`tile-counts-${story.id}`}>
              {own && <span className="story-tile__chip story-tile__chip--own">свой файл</span>}
              {counts.map((c) => (
                <span className="story-tile__chip" key={c}>
                  {c}
                </span>
              ))}
            </span>
          )}
        </span>

        <span className="story-tile__title">{story.title}</span>
        {story.tagline && <span className="story-tile__tagline">{keepShortWords(story.tagline)}</span>}

        {teasers.length > 0 && (
          <span className="story-tile__teasers" data-testid={`tile-teasers-${story.id}`}>
            {teasers.map((t) => (
              <span className="story-tile__teaser" key={t}>
                {t}
              </span>
            ))}
          </span>
        )}

        <span className="story-tile__foot">
          <span className="story-tile__meta">
            {state !== null ? (
              <>
                <span className="story-tile__state">{state}</span>
                {ago && <span className="story-tile__ago">{ago}</span>}
              </>
            ) : time.length ? (
              time.map((line) => (
                <span className="story-tile__time" key={line}>
                  {line}
                </span>
              ))
            ) : (
              !counts.length && <span className="story-tile__time">Новая история</span>
            )}
          </span>
          <span className={going ? 'story-tile__cta story-tile__cta--strong' : 'story-tile__cta'}>
            {going ? 'Продолжить' : 'Открыть'} →
          </span>
        </span>
      </button>
    </li>
  );
}
