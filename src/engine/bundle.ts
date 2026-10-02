import { CONTACT_COLORS, compileInk } from './engine';
import { DEFAULT_COVER, type Story, type StoryFile } from './story';

/** Из имени файла получаем id: «Эпизод 2.story.json» → «эпизод-2». */
function idFromFileName(name: string): string {
  return (
    name
      .replace(/\.(story\.)?(json|ink)$/i, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || `story-${Date.now()}`
  );
}

export type ParseResult = { story: Story } | { error: string };

/**
 * Разбирает загруженный файл. Понимает два вида:
 *   .json — вся история целиком (описание, герои, главы и сценарий внутри)
 *   .ink  — только сценарий, остальное достроим из заголовка файла
 */
export function parseStoryFile(fileName: string, text: string): ParseResult {
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith('{');

  let file: StoryFile;
  if (looksJson) {
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch (e) {
      return { error: `Файл не разобрался как JSON: ${(e as Error).message}` };
    }
    if (!raw || typeof raw !== 'object') return { error: 'В файле должен быть объект истории' };
    file = raw as StoryFile;
    if (file.format && file.format !== 'relayer-story') {
      return { error: `Чужой формат: "${file.format}". Ожидается "relayer-story"` };
    }
    if (!file.ink || !file.ink.trim()) return { error: 'В истории нет поля "ink" со сценарием' };
    if (!file.title?.trim()) return { error: 'В истории нет названия (поле "title")' };
  } else {
    // голый .ink: название возьмём из глобального тега # title
    const title = trimmed.match(/^#\s*title\s*:\s*(.+)$/m)?.[1]?.trim();
    file = {
      format: 'relayer-story',
      version: 1,
      id: idFromFileName(fileName),
      title: title || fileName.replace(/\.ink$/i, ''),
      tagline: 'Загруженный сценарий',
      cover: DEFAULT_COVER,
      ink: trimmed,
    };
  }

  const ink = (file.ink ?? '').trim();
  const compiled = compileInk(ink);
  if ('errors' in compiled) {
    return { error: `Сценарий не компилируется:\n${compiled.errors.slice(0, 5).join('\n')}` };
  }

  return {
    story: {
      format: 'relayer-story',
      version: 1,
      id: (file.id || idFromFileName(fileName)).trim(),
      series: file.series,
      title: file.title.trim(),
      tagline: file.tagline || '',
      synopsis: file.synopsis,
      minutes: file.minutes,
      chapters: file.chapters,
      characters: file.characters,
      features: file.features,
      cover: file.cover ?? DEFAULT_COVER,
      ink,
      origin: 'upload',
    },
  };
}

/** Выгрузка истории одним файлом: то же, что принимает загрузка. */
export function toStoryFile(story: Story): string {
  const { origin: _origin, ...file } = story;
  return JSON.stringify(file, null, 2);
}

export function downloadStory(story: Story) {
  const blob = new Blob([toStoryFile(story)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${story.id}.story.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Цвета контактов лежат в глобальных тегах сценария (# contact: theo, Тео, blue).
 * Экрану истории они нужны, чтобы кружки героев совпадали с чатом.
 */
export function storyPalette(ink: string): Record<string, string> {
  const palette: Record<string, string> = {};
  for (const m of ink.matchAll(/^#\s*contact\s*:\s*([^,\n]+),\s*([^,\n]+)(?:,\s*([^\n]+))?$/gm)) {
    const id = m[1].trim();
    const token = (m[3] ?? '').trim();
    palette[id] = CONTACT_COLORS[token] ?? token ?? CONTACT_COLORS.grey;
  }
  return palette;
}
