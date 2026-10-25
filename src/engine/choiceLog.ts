import type { Engine, LogEntry } from './engine';
import type { Story } from './story';

/**
 * Файл журнала выборов (E-03): тестер выгружает его из отладки и присылает автору.
 * Верхние route / start / set — то же, что читает story:trace --from-save (scripts/story/core/run.mjs, readSave):
 * бот проходит маршрут тестера и печатает переписку с узлами. Поля storyState и relay:<id> сюда нельзя —
 * readSave решит, что это сохранение движка, и маршрут не возьмёт.
 */
export interface ChoiceLogFile {
  format: 'relayer-choices';
  version: 1;
  storyId: string;
  title: string;
  revision: number | null;
  mode: Engine['mode'];
  startedAt: string;
  exportedAt: string;
  /** Где игрок сейчас: глава, развилка, кончилась ли история. */
  chapter: string;
  knot: string | null;
  ended: boolean;
  /** Номера кнопок по порядку развилок, −1 — «не ответил»: как --route у story:trace. */
  route: number[];
  /** После перехода из отладки маршрут идёт от этого узла, с переменными на момент перехода. */
  start: string | null;
  set: Record<string, string | number | boolean> | null;
  /** false — в отладке прыгали по узлам или правили переменные: бот повторит маршрут лишь приблизительно. */
  exact: boolean;
  choices: (Omit<LogEntry, 'at'> & { n: number; at: string })[];
}

export function toChoiceLog(engine: Engine, story: Pick<Story, 'id' | 'title' | 'revision'>, now = Date.now()): ChoiceLogFile {
  const log = engine.journal();
  const view = engine.view();
  let route: number[] = [];
  let start: string | null = null;
  let set: ChoiceLogFile['set'] = null;
  for (const e of log) {
    if (e.kind === 'choice' || e.kind === 'noanswer') route.push(e.picked ?? -1);
    // переход начинает маршрут заново: бот не умеет прыгать посреди прохождения
    else if (e.kind === 'jump') {
      route = [];
      start = e.text;
      set = { ...e.vars };
    }
  }
  const last = [...log].reverse().find((e) => e.kind !== 'remind');
  return {
    format: 'relayer-choices',
    version: 1,
    storyId: story.id,
    title: story.title,
    revision: story.revision ?? null,
    mode: engine.mode,
    startedAt: new Date(engine.startedAt).toISOString(),
    exportedAt: new Date(now).toISOString(),
    chapter: view.chapter,
    knot: engine.currentKnot() ?? last?.knot ?? null,
    ended: view.ended,
    route,
    start,
    set,
    exact: !log.some((e) => e.kind === 'jump' || e.kind === 'set'),
    choices: log.map((e, i) => ({ ...e, n: i + 1, at: new Date(e.at).toISOString() })),
  };
}

export function downloadChoiceLog(engine: Engine, story: Pick<Story, 'id' | 'title' | 'revision'>) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const blob = new Blob([JSON.stringify(toChoiceLog(engine, story, now.getTime()), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${story.id}.choices-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const pad = (n: number) => String(n).padStart(2, '0');
