// Пороги всех инструментов (story:lint, story:*, лаборатория, хуки) — только из docs/playbook/thresholds.json.
// Ключа нет — исключение, а не число по умолчанию: так порог не может тихо появиться в коде.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const THRESHOLDS_PATH = fileURLToPath(new URL('../../docs/playbook/thresholds.json', import.meta.url));
const FILE = 'docs/playbook/thresholds.json';
/** Единицы времени в thresholds.json → секунды: команды считают время в секундах, а пороги пишутся как удобно читать. */
const SECONDS = { 'с': 1, 'мин': 60, 'ч': 3600, 'дн': 86400 };
export const LEVELS = ['error', 'warning', 'hint'];
export const LEVEL_RU = { error: 'ошибка', warning: 'предупреждение', hint: 'подсказка' };
export const REQUIRED_FIELDS = ['value', 'unit', 'level', 'basis', 'sources', 'calibrated_on', 'history'];

/** Пороги из файла (или готового объекта — для самопроверки). */
export function loadThresholds(source = THRESHOLDS_PATH) {
  const all = typeof source === 'string' ? JSON.parse(readFileSync(source, 'utf8')) : source;
  const get = (key) => {
    const t = all[key];
    if (!t || key.startsWith('_')) throw new Error(`нет порога «${key}» в thresholds.json`);
    return t;
  };
  const value = (key) => get(key).value;
  const cache = new Map();
  /** Словарь как регулярка: без \b — в JS он не видит кириллицу (cron-wired-for-story:A1). */
  const re = (key, sub) => {
    const id = sub ? `${key}.${sub}` : key;
    if (!cache.has(id)) {
      const v = sub ? value(key)[sub] : value(key);
      cache.set(id, new RegExp(v, 'iu'));
    }
    return cache.get(id);
  };
  /** «> 160 знаков (narrative-testing:§2а)» — для вывода «порог (опора)». */
  const show = (key) => {
    const t = get(key);
    const v = typeof t.value === 'number' ? fmtNum(t.value) : null;
    const head = v == null ? key : [t.op && !/\s/.test(t.op) ? t.op : null, v, t.unit].filter(Boolean).join(' ');
    return `${head} (${basisText(t)})`;
  };
  /** E-NN, если порог ждёт фичи движка: проверка его пропускает и пишет в skipped. */
  const deferred = (key) => get(key).deferred ?? null;
  /** Порог времени в секундах по его единице; не время — исключение, чтобы минуты не сравнили с секундами. */
  const seconds = (key) => {
    const t = get(key);
    const k = SECONDS[t.unit];
    if (k == null || typeof t.value !== 'number') throw new Error(`порог «${key}» не время (единица «${t.unit}»)`);
    return t.value * k;
  };
  /** Порог для --json команд: ключ, значение, единица, опора и откуда взят. */
  const entry = (key) => {
    const t = get(key);
    return { key, value: t.value, unit: t.unit ?? null, from: FILE, basis: t.basis ?? null };
  };
  return { all, get, value, re, show, deferred, seconds, entry, keys: () => Object.keys(all).filter((k) => !k.startsWith('_')) };
}

let shared = null;
/** Пороги из docs/playbook/thresholds.json, прочитанные один раз на процесс. */
export const thresholds = () => (shared ??= loadThresholds());
export const threshold = (key) => thresholds().value(key);
export const thresholdEntry = (key) => thresholds().entry(key);
export const thresholdSeconds = (key) => thresholds().seconds(key);

function fmtNum(n) {
  if (!Number.isInteger(n) && n < 1) return `${String(Math.round(n * 1000) / 10).replace('.', ',')} %`;
  return String(n).replace('.', ',');
}

function basisText(t) {
  const src = (t.sources ?? []).slice(0, 2).join(', ');
  if (t.basis === 'our_estimate') return src ? `наша оценка; ${src}` : 'наша оценка';
  if (t.basis === 'author_decision') return src ? `решение автора; ${src}` : 'решение автора';
  return src || 'источник';
}

export const BASES = ['source', 'our_estimate', 'author_decision'];
// области общих ключей; attn.* — пороги нагрузки attention-merged.md §6 без своей проверки
// trace / cast / endings / vars — настройки и пороги команд story:*, а не проверок
const AREAS = ['story', 'engine', 'lint', 'dict', 'lab', 'skill', 'style', 'bot', 'attn', 'trace', 'cast', 'endings', 'vars'];
const NO_CHECKS = ['dict', 'lint', 'lab', 'skill', 'bot', 'trace', 'cast', 'endings', 'vars'];

/** Схема файла: обязательные поля, уровни, опора. Возвращает список ошибок. */
export function validateThresholds(all) {
  const errors = [];
  for (const [key, t] of Object.entries(all)) {
    if (key.startsWith('_')) continue;
    for (const f of REQUIRED_FIELDS) if (!(f in t)) errors.push(`${key}: нет поля ${f}`);
    if (t.level != null && !LEVELS.includes(t.level)) errors.push(`${key}: уровень «${t.level}» не из ${LEVELS.join(' / ')}`);
    if (!BASES.includes(t.basis)) errors.push(`${key}: basis «${t.basis}» не ${BASES.join(' / ')}`);
    if (t.deferred != null && !/^E-\d\d$/.test(t.deferred)) errors.push(`${key}: deferred «${t.deferred}» — не E-NN`);
    if (!Array.isArray(t.sources)) errors.push(`${key}: sources — не список`);
    if (!Array.isArray(t.history) || !t.history.length) errors.push(`${key}: пустая history`);
    const area = key.split('.')[0];
    if (!/^C-\d\d$/.test(area) && !AREAS.includes(area)) errors.push(`${key}: ключ не C-NN.* и не из областей ${AREAS.join(' / ')}`);
    if (!/^C-\d\d$/.test(area) && !NO_CHECKS.includes(area) && !Array.isArray(t.checks)) errors.push(`${key}: общий ключ без поля checks`);
  }
  return errors;
}
