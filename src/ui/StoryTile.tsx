import type { Progress, Story } from '../engine';
import { formatAgo, sizeLabel } from '../engine';

/** Карточка истории на главном экране. Квадрат с обложкой и состоянием прохождения. */
export function StoryTile({
  story,
  progress,
  onOpen,
}: {
  story: Story;
  progress: Progress | null;
  onOpen: () => void;
}) {
  const state = !progress
    ? sizeLabel(story.chapters?.length, story.minutes)
    : progress.ended
      ? 'Пройдено'
      : progress.chapter || `${progress.messages} сообщений`;
  const ago = progress && !progress.ended && progress.savedAt ? formatAgo(progress.savedAt) : '';

  return (
    <li
      className={progress ? 'story-tile story-tile--started is-rising' : 'story-tile is-rising'}
      style={{
        ['--cover-from' as string]: story.cover.from,
        ['--cover-to' as string]: story.cover.to,
      }}
    >
      <button className="story-tile__open" onClick={onOpen} data-testid={`tile-${story.id}`}>
        <span className="story-tile__glyph" aria-hidden="true">
          {story.cover.glyph}
        </span>
        {story.series && <span className="story-tile__kicker">{story.series}</span>}
        <span className="story-tile__title">{story.title}</span>
        <span className="story-tile__tagline">{story.tagline}</span>
        <span className="story-tile__foot">
          <span className="story-tile__state">{state}</span>
          {ago && <span className="story-tile__ago">{ago}</span>}
          <span className="story-tile__cta">{progress && !progress.ended ? 'Продолжить' : 'Открыть'} →</span>
        </span>
      </button>
      {story.origin === 'upload' && <span className="story-tile__mark">свой файл</span>}
    </li>
  );
}
