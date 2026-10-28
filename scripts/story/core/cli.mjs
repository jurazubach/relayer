// Общее для команд story:*: разбор аргументов, выбор историй, вывод текста или JSON.
import { listStories } from '../../lib/story.mjs';

/**
 * argv → { has(name), get(name), all(name), refs }. Флаги из `bool` значения не берут.
 * `--story a,b`, `--story a --story b` и голые аргументы — одно и то же: список историй.
 * Голые аргументы отдельно — в positional: story:rule и story:diff читают их как ID и ревизии.
 */
export function parseArgs(argv, { bool = [] } = {}) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && a !== '-h') { positional.push(a); continue; }
    let name = a === '-h' ? 'help' : a.slice(2);
    let value = true;
    const eq = name.indexOf('=');
    if (eq >= 0) { value = name.slice(eq + 1); name = name.slice(0, eq); }
    else if (!bool.includes(name) && name !== 'help' && name !== 'json' && i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
    if (!flags.has(name)) flags.set(name, []);
    flags.get(name).push(value);
  }
  const all = (name) => flags.get(name) ?? [];
  const get = (name, dflt = null) => (flags.has(name) ? flags.get(name).at(-1) : dflt);
  const stories = [...all('story').flatMap((s) => String(s).split(',')), ...positional].filter(Boolean);
  return { has: (n) => flags.has(n), get, all, refs: stories.length ? stories : listStories(), flags, positional };
}

/** Целое из флага; неправильное — ошибка, а не тихий ноль. */
export function intFlag(args, name, dflt) {
  const v = args.get(name);
  if (v == null || v === true) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name}: нужно целое число, а не «${v}»`);
  return n;
}

/**
 * Запуск команды: --help, ошибки одной строкой, код выхода. main возвращает код или ничего.
 * Код — через exitCode, а не process.exit: иначе большой --json в трубу обрезается на 64–128 КБ.
 */
export async function runCli(help, main, opts) {
  try {
    const args = parseArgs(process.argv.slice(2), opts);
    if (args.has('help')) { console.log(help); return; }
    // Известные флаги берём из справки: опечатка во флаге иначе молча даёт прогон по умолчанию.
    const known = new Set(['help', 'json', ...[...help.matchAll(/--([a-z][a-z-]*)/g)].map((m) => m[1])]);
    const unknown = [...args.flags.keys()].filter((n) => !known.has(n));
    if (unknown.length) throw new Error(`неизвестный флаг ${unknown.map((n) => `--${n}`).join(', ')} (см. --help)`);
    process.exitCode = (await main(args)) ?? 0;
  } catch (e) {
    console.error(`ошибка: ${e.message}`);
    process.exitCode = 2;
  }
}

export const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');
export const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Таблица для консоли: колонки по ширине, без рамок. */
export function table(rows, head) {
  const all = head ? [head, ...rows] : rows;
  const w = all[0].map((_, i) => Math.max(...all.map((r) => String(r[i] ?? '').length)));
  const line = (r) => r.map((c, i) => String(c ?? '').padEnd(w[i])).join('  ').trimEnd();
  const out = all.map(line);
  if (head) out.splice(1, 0, w.map((n) => '─'.repeat(n)).join('  '));
  return out.join('\n');
}
