/**
 * История — один самодостаточный объект: описание, герои, главы и сам сценарий на ink.
 * Такой объект можно выгрузить одним .json, передать, поправить и загрузить обратно
 * кнопкой «Загрузить» на главном экране.
 */

export interface Cover {
  /** Градиент карточки: верхний и нижний цвет. */
  from: string;
  to: string;
  /** Крупный знак на карточке. */
  glyph: string;
}

export interface Character {
  /** id контакта из сценария (# contact: theo, ...), если персонаж пишет в чат. */
  id?: string;
  name: string;
  /** Кто это одной строкой: «подруга Рэя, прачечная 24/7». */
  role: string;
  /** Пара предложений для экрана истории. */
  about?: string;
  /** Цвет кружка. По умолчанию берётся из сценария. */
  color?: string;
}

export interface ChapterInfo {
  title: string;
  /** Когда происходит: «ночь», «утро». */
  when?: string;
  about?: string;
}

export interface Story {
  format: 'relayer-story';
  version: 1;
  id: string;
  /** Надпись над названием: мир или сериал. */
  series?: string;
  title: string;
  /** Одна строка о чём это — она же на карточке. */
  tagline: string;
  /** Абзац-два: завязка без спойлеров. */
  synopsis?: string;
  /** Сколько примерно занимает эпизод в реальном времени. */
  minutes?: number;
  chapters?: ChapterInfo[];
  characters?: Character[];
  /** Чем эта история интересна: «ответы уходят в разные чаты». */
  features?: string[];
  cover: Cover;
  /** Сценарий на ink. */
  ink: string;
  /** Откуда взялась: лежит в коде или загружена с устройства. Не хранится в файле. */
  origin: 'builtin' | 'upload';
}

/** То, что лежит в файле: то же самое, но без origin (и ink может жить отдельным .ink). */
export type StoryFile = Omit<Story, 'origin' | 'ink'> & { ink?: string };

export const DEFAULT_COVER: Cover = { from: '#334155', to: '#0f141b', glyph: '✳' };
