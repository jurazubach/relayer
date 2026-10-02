import { useRef, useState } from 'react';
import type { Progress, Story } from '../engine';
import { StoryTile } from './StoryTile';

/**
 * Главный экран: истории карточками. Тап открывает описание истории.
 * Плитка «Загрузить» принимает свой .json (или .ink) — он появляется в приложении сразу.
 */
export function HomeScreen({
  stories,
  progressOf,
  onOpen,
  onUpload,
}: {
  stories: Story[];
  progressOf: (id: string) => Progress | null;
  onOpen: (id: string) => void;
  /** Возвращает текст ошибки или null, если файл подошёл. */
  onUpload: (file: File) => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    onUpload(file)
      .then(setError)
      .finally(() => setBusy(false));
  };

  return (
    <div className="screen" data-testid="home">
      <header className="screen__header">
        <h1 className="screen__title">Истории</h1>
        <p className="screen__subtitle">Переписки, которые идут в реальном времени</p>
      </header>

      <ul className="tiles">
        {stories.map((s) => (
          <StoryTile key={s.id} story={s} progress={progressOf(s.id)} onOpen={() => onOpen(s.id)} />
        ))}

        <li className="story-tile story-tile--add">
          <button
            className="story-tile__open"
            onClick={() => fileRef.current?.click()}
            data-testid="upload"
            disabled={busy}
          >
            <span className="story-tile__glyph" aria-hidden="true">
              +
            </span>
            <span className="story-tile__title">{busy ? 'Читаю файл…' : 'Загрузить историю'}</span>
            <span className="story-tile__tagline">.json со сценарием внутри или просто .ink</span>
          </button>
        </li>
      </ul>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.ink,application/json,text/plain"
        hidden
        data-testid="upload-input"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="error-box" role="alert" data-testid="upload-error">
          <pre className="error-box__text">{error}</pre>
          <button className="btn btn--ghost" onClick={() => setError(null)}>
            Понятно
          </button>
        </div>
      )}

      <footer className="screen__footer">Истории и прогресс хранятся в этом браузере</footer>
    </div>
  );
}
