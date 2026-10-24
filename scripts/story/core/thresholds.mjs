// Пороги команд story:* — только по ключу. Источник правды — docs/playbook/thresholds.json (T-03);
// запасной файл рядом нужен, пока там нет наших ключей, чтобы команды работали уже сейчас.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN = 'docs/playbook/thresholds.json';
const FALLBACK = join(dirname(fileURLToPath(import.meta.url)), 'thresholds.default.json');

const read = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
let cache = null;

/** Запись по ключу: плоский ключ, вложенный объект или раздел thresholds — формат T-03 ещё не закреплён. */
function lookup(data, key) {
  const pools = [data, data.thresholds, data.keys].filter((p) => p && typeof p === 'object');
  for (const p of pools) {
    if (key in p) return p[key];
    let cur = p;
    for (const part of key.split('.')) cur = cur && typeof cur === 'object' ? cur[part] : undefined;
    if (cur !== undefined) return cur;
  }
  return undefined;
}

/** { value, from } по ключу. Нет ни там, ни там — ошибка: число в коде не появляется. */
export function thresholdEntry(key) {
  cache ??= { main: read(MAIN), fallback: read(FALLBACK) };
  for (const [from, data] of [[MAIN, cache.main], [FALLBACK, cache.fallback]]) {
    const e = lookup(data, key);
    if (e === undefined) continue;
    const value = typeof e === 'object' && e !== null ? e.value : e;
    if (typeof value === 'number') return { key, value, from, basis: e?.basis ?? null };
  }
  throw new Error(`нет порога «${key}» ни в ${MAIN}, ни в ${FALLBACK}`);
}

export const threshold = (key) => thresholdEntry(key).value;
