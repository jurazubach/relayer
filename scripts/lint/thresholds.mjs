// Пороги story:lint — только из docs/playbook/thresholds.json. Ключа нет — исключение, а не число по умолчанию:
// так порог не может тихо появиться в коде проверки.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const THRESHOLDS_PATH = fileURLToPath(new URL('../../docs/playbook/thresholds.json', import.meta.url));
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
  return { all, get, value, re, show, keys: () => Object.keys(all).filter((k) => !k.startsWith('_')) };
}

function fmtNum(n) {
  if (!Number.isInteger(n) && n < 1) return `${String(Math.round(n * 1000) / 10).replace('.', ',')} %`;
  return String(n).replace('.', ',');
}

function basisText(t) {
  const src = (t.sources ?? []).slice(0, 2).join(', ');
  if (t.basis === 'our_estimate') return src ? `наша оценка; ${src}` : 'наша оценка';
  return src || 'источник';
}

/** Схема файла: обязательные поля, уровни, опора. Возвращает список ошибок. */
export function validateThresholds(all) {
  const errors = [];
  for (const [key, t] of Object.entries(all)) {
    if (key.startsWith('_')) continue;
    for (const f of REQUIRED_FIELDS) if (!(f in t)) errors.push(`${key}: нет поля ${f}`);
    if (t.level != null && !LEVELS.includes(t.level)) errors.push(`${key}: уровень «${t.level}» не из ${LEVELS.join(' / ')}`);
    if (!['source', 'our_estimate'].includes(t.basis)) errors.push(`${key}: basis «${t.basis}» не source / our_estimate`);
    if (!Array.isArray(t.sources)) errors.push(`${key}: sources — не список`);
    if (!Array.isArray(t.history) || !t.history.length) errors.push(`${key}: пустая history`);
    if (!/^(C-\d\d|story|engine|lint|dict|lab|skill)\./.test(key)) errors.push(`${key}: ключ не C-NN.* и не из областей story / engine / lint / dict / lab / skill`);
    if (!/^C-\d\d\./.test(key) && !key.startsWith('dict.') && !key.startsWith('lint.') && !key.startsWith('lab.') && !key.startsWith('skill.') && !Array.isArray(t.checks)) {
      errors.push(`${key}: общий ключ без поля checks`);
    }
  }
  return errors;
}
