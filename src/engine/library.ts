import { parseStoryFile } from './bundle';
import { readProgress, type Progress } from './progress';
import type { Story, StoryFile } from './story';
import { readUploads, removeUpload, saveUpload } from './uploads';

/**
 * Библиотека историй: всё, что приложение может открыть.
 *
 * Встроенные истории — просто файлы src/stories/<alias>.json. Положил файл в папку,
 * он сам оказался в приложении: ничего регистрировать не нужно.
 * Загруженные с устройства лежат в localStorage в том же формате.
 */

const files = import.meta.glob<StoryFile>('../stories/*.json', { eager: true, import: 'default' });

/** alias файла (the-number.json → the-number) на случай, если в самом файле id забыли. */
const aliasOf = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

export const BUILTIN: Story[] = Object.entries(files)
  .map(([path, file]) => ({
    ...(file as Story),
    id: file.id || aliasOf(path),
    origin: 'builtin' as const,
  }))
  .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

export const isBuiltin = (id: string) => BUILTIN.some((s) => s.id === id);

/**
 * Полный список: встроенные плюс загруженные.
 * Если историю сначала загрузили файлом, а потом она приехала в репозиторий,
 * побеждает встроенная — иначе на главном было бы две одинаковых карточки.
 * Прогресс у них общий: он хранится по id, а не по происхождению.
 */
export function allStories(uploads: Story[] = readUploads()): Story[] {
  return [...BUILTIN, ...uploads.filter((s) => !isBuiltin(s.id))];
}

export function findStory(id: string, uploads: Story[] = readUploads()): Story | undefined {
  return allStories(uploads).find((s) => s.id === id);
}

export type AddResult = { story: Story } | { error: string };

/** Разбирает файл и кладёт в библиотеку. История с тем же id заменяется. */
export async function addStoryFromFile(file: File): Promise<AddResult> {
  const parsed = parseStoryFile(file.name, await file.text());
  if ('error' in parsed) return parsed;
  if (isBuiltin(parsed.story.id)) {
    return { error: `id «${parsed.story.id}» занят встроенной историей. Поменяйте поле "id" в файле.` };
  }
  try {
    saveUpload(parsed.story);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return parsed;
}

export { removeUpload, readUploads, readProgress };
export type { Progress };

/** Подпись одной строкой: для списков и панели отладки. */
export const storyLabel = (s: Story): string => (s.series ? `${s.series} · ${s.title}` : s.title);

/** «1 глава», «2 главы», «5 глав». */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Подпись объёма истории: «5 глав · ~25 мин». */
export function sizeLabel(chapters?: number, minutes?: number): string {
  const parts: string[] = [];
  if (chapters) parts.push(`${chapters} ${plural(chapters, 'глава', 'главы', 'глав')}`);
  if (minutes) parts.push(`~${minutes} мин`);
  return parts.join(' · ') || 'Новая история';
}
