import type { Story } from './story';

/** Загруженные с устройства истории живут здесь же, в браузере. */
const KEY = 'relay:uploads';

export function readUploads(): Story[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Story[];
    return Array.isArray(list) ? list.map((s) => ({ ...s, origin: 'upload' as const })) : [];
  } catch {
    return [];
  }
}

function write(list: Story[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    throw new Error(
      'Не хватило места в браузере. Удалите одну из загруженных историй и попробуйте снова.',
    );
  }
}

/** Повторная загрузка той же истории заменяет её: правишь файл и грузишь снова. */
export function saveUpload(story: Story): Story[] {
  const list = readUploads().filter((s) => s.id !== story.id);
  const next = [story, ...list];
  write(next);
  return next;
}

export function removeUpload(id: string): Story[] {
  const next = readUploads().filter((s) => s.id !== id);
  write(next);
  return next;
}
