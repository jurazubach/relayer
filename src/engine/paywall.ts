/**
 * Бесплатная граница глав (E-05): поле free_chapters — сколько первых глав бесплатно.
 * Граница только на стыке глав: движок не выдаёт первое сообщение следующей главы, пока продолжение закрыто.
 * Число и номера глав игрок не видит (A-08): для него это «начало» и «продолжение».
 * Покупки пока нет — заглушка; открыть всё можно в отладке, и это помнится для истории отдельно от прогресса:
 * «начать заново» не закрывает купленное.
 */
import { readLocal, writeLocal } from './flags';
import type { Story } from './story';

/**
 * Сколько глав бесплатно; null — граница не действует: поля нет, оно негодное
 * или бесплатны все главы, которые описаны в meta.
 */
export function freeChapters(story: Pick<Story, 'free_chapters' | 'chapters'>): number | null {
  const n = story.free_chapters;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return null;
  const total = story.chapters?.length;
  return total && n >= total ? null : n;
}

/** Поле есть, но им нельзя пользоваться: загрузка объясняет автору, что не так. */
export const badFreeChapters = (value: unknown): boolean =>
  value != null && (typeof value !== 'number' || !Number.isInteger(value) || value < 1);

const key = (storyId: string) => `relay:open:${storyId}`;

/** Все главы открыты: пока только из отладки, потом — покупкой. */
export const readChaptersOpen = (storyId: string): boolean => readLocal(key(storyId)) === '1';

export function writeChaptersOpen(storyId: string, open: boolean) {
  if (open) writeLocal(key(storyId), '1');
  else {
    try {
      localStorage.removeItem(key(storyId));
    } catch {
      /* без хранилища нечего стирать */
    }
  }
}

/** Граница, которая ещё закрыта для игрока: открытое продолжение границы не имеет. */
export const closedChapters = (story: Pick<Story, 'id' | 'free_chapters' | 'chapters'>): number | null =>
  readChaptersOpen(story.id) ? null : freeChapters(story);

/** Плашка на карточке рядом с числом героев: без номера главы, только «есть бесплатное начало». */
export const freeChip = 'начало бесплатно';

/** Строка на экране истории: что бесплатно и что дальше. */
export const freeLine = 'Начало бесплатно, дальше — платное продолжение';
