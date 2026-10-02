import { useCallback, useMemo, useState } from 'react';
import { addStoryFromFile, allStories, readUploads, removeUpload } from './library';
import { clearProgress, readProgress, type Progress } from './progress';
import type { Story } from './story';

export interface Library {
  /** Встроенные и загруженные истории одним списком. */
  stories: Story[];
  find: (id: string) => Story | undefined;
  progress: (id: string) => Progress | null;
  /** Загрузить файл. Возвращает текст ошибки или null, если всё хорошо. */
  add: (file: File) => Promise<string | null>;
  /** Убрать загруженную историю вместе с её прогрессом. */
  remove: (id: string) => void;
  /** Стереть прогресс, оставив саму историю. */
  reset: (id: string) => void;
}

/** Библиотека историй как состояние React: список, прогресс, загрузка и удаление. */
export function useLibrary(onAdded?: (story: Story) => void): Library {
  const [uploads, setUploads] = useState<Story[]>(readUploads);
  /** Растёт после сброса прогресса — экраны перечитывают сохранения. */
  const [stamp, setStamp] = useState(0);

  const stories = useMemo(() => allStories(uploads), [uploads]);

  const add = useCallback(
    async (file: File) => {
      const result = await addStoryFromFile(file);
      if ('error' in result) return result.error;
      setUploads(readUploads());
      onAdded?.(result.story);
      return null;
    },
    [onAdded],
  );

  return {
    stories,
    find: useCallback((id: string) => stories.find((s) => s.id === id), [stories]),
    // stamp в зависимостях нарочно: после сброса прогресса функция должна стать новой
    progress: useCallback((id: string) => readProgress(id), [stamp]),
    add,
    remove: useCallback((id: string) => {
      clearProgress(id);
      setUploads(removeUpload(id));
    }, []),
    reset: useCallback((id: string) => {
      clearProgress(id);
      setStamp((n) => n + 1);
    }, []),
  };
}
