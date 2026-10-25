/**
 * Главный экран показывает состояние каждой истории, но движок там не нужен:
 * сохранение движка лежит в localStorage готовым, читаем его напрямую.
 */
import { DEFAULT_MODE, type Mode } from './engine';

export interface Progress {
  /** Хотя бы одно сообщение пришло. */
  started: boolean;
  ended: boolean;
  /** Название текущей главы, если сценарий их размечает. */
  chapter: string;
  messages: number;
  /** Когда играли в последний раз. */
  savedAt: number;
  /** В каком режиме идёт игра: сменить его можно только перезапуском. */
  mode: Mode;
}

const key = (storyId: string) => `relay:${storyId}`;

export function readProgress(storyId: string): Progress | null {
  try {
    const raw = localStorage.getItem(key(storyId));
    if (!raw) return null;
    const d = JSON.parse(raw) as {
      messages?: unknown[];
      ended?: boolean;
      chapter?: string;
      savedAt?: number;
      mode?: Mode;
    };
    const messages = Array.isArray(d.messages) ? d.messages.length : 0;
    if (!messages) return null;
    return {
      started: true,
      ended: !!d.ended,
      chapter: d.chapter ?? '',
      messages,
      savedAt: d.savedAt ?? 0,
      mode: d.mode ?? DEFAULT_MODE,
    };
  } catch {
    return null;
  }
}

export function clearProgress(storyId: string) {
  try {
    localStorage.removeItem(key(storyId));
  } catch {
    /* без хранилища просто нечего стирать */
  }
}

/** «вчера», «5 минут назад» — короткая подпись под карточкой. */
export function formatAgo(ts: number, now = Date.now()): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'вчера' : `${d} дн назад`;
}
