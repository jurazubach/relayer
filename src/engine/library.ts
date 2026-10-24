import { parseStoryFile } from './bundle';
import { readProgress, type Progress } from './progress';
import type { Story, StoryFile } from './story';
import { readUploads, removeUpload, saveUpload } from './uploads';

/**
 * Библиотека историй: всё, что приложение может открыть.
 *
 * Встроенные истории — папки src/stories/<alias>/: meta.json с описанием, story.ink и главы,
 * которые он подключает через INCLUDE. Положил папку — она сама оказалась в приложении:
 * ничего регистрировать не нужно. Одиночный src/stories/<alias>.json тоже подхватывается,
 * но если рядом есть папка с тем же alias, источник — папка, а .json — её копия от story:pack.
 * Загруженные с устройства лежат в localStorage в том же формате, что .json.
 */

type StoryMeta = Omit<StoryFile, 'ink' | 'includes'>;

const metas = import.meta.glob<StoryMeta>('../stories/*/meta.json', { eager: true, import: 'default' });
const inks = import.meta.glob<string>('../stories/*/**/*.ink', { eager: true, query: '?raw', import: 'default' });
const files = import.meta.glob<StoryFile>('../stories/*.json', { eager: true, import: 'default' });

const MAIN = 'story.ink';

/** alias по пути: ../stories/the-number/meta.json и ../stories/the-number.json → the-number. */
const aliasOf = (path: string) => path.replace(/^\.\.\/stories\//, '').split('/')[0].replace(/\.json$/, '');

function fromFolder(alias: string, meta: StoryMeta): Story {
  const prefix = `../stories/${alias}/`;
  const own = Object.entries(inks).filter(([path]) => path.startsWith(prefix));
  const includes = Object.fromEntries(own.map(([path, text]) => [path.slice(prefix.length), text]).filter(([name]) => name !== MAIN));
  return {
    ...(meta as Story),
    id: meta.id || alias,
    ink: own.find(([path]) => path === prefix + MAIN)?.[1] ?? '',
    includes,
    origin: 'builtin' as const,
  };
}

const folders = Object.entries(metas).map(([path, meta]) => fromFolder(aliasOf(path), meta));
const single = Object.entries(files)
  .filter(([path]) => !(`../stories/${aliasOf(path)}/meta.json` in metas))
  .map(([path, file]) => ({ ...(file as Story), id: file.id || aliasOf(path), origin: 'builtin' as const }));

export const BUILTIN: Story[] = [...folders, ...single].sort((a, b) => a.title.localeCompare(b.title, 'ru'));

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

/**
 * Подпись объёма истории: «5 глав · ~25 мин», с днями — «5 глав · ~25 мин · ~2 дня».
 * Минуты — режим «по клику», дни — реальное время; меньше суток показываем часами.
 */
export function sizeLabel(chapters?: number, minutes?: number, days?: number): string {
  const parts: string[] = [];
  if (chapters) parts.push(`${chapters} ${plural(chapters, 'глава', 'главы', 'глав')}`);
  if (minutes) parts.push(`~${minutes} мин`);
  if (days && days >= 1) {
    const n = Math.round(days);
    parts.push(`~${n} ${plural(n, 'день', 'дня', 'дней')}`);
  } else if (days) parts.push(`~${Math.max(1, Math.round(days * 24))} ч`);
  return parts.join(' · ') || 'Новая история';
}
