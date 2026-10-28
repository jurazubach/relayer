// premise-check — логлайн и ядро-правило направления (R-02, R-04, R-05): длина, роль игрока, противопоставление,
// правило, а не событие. Считает форму; есть ли в логлайне ирония по смыслу, судит модель по patterns-premise.md.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseInk } from '../../../../scripts/lib/ink.mjs';
import { loadStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { STATE_DIR } from '../../../../scripts/story/core/state.mjs';
import { FILE, parseRounds } from './directions.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/premise-check.mjs --logline "<логлайн>" [--rule "<правило>" --rule "<ещё>"] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/premise-check.mjs --directions <id> [--round N] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/premise-check.mjs --story <id> [--json]

Логлайн (R-02, snyder-save-the-cat:GREEN-01):
  · не длиннее skill.brainstorm.logline.max_words слов;
  · есть роль игрока — «ты / тебе / тебя» (dict.player_role);
  · есть противопоставление — «но / а / хотя / =» (dict.logline_irony): без него нет иронии.
Ядро-правило (R-04, R-05):
  · правил не больше skill.brainstorm.rule.max_rules, каждое не длиннее skill.brainstorm.rule.max_words слов;
  · правило, а не событие: прошедшее время или «однажды» (dict.rule_event) — кандидат «это событие».

  --directions <id>  логлайны и «ядро-правило» направлений раунда из ${STATE_DIR}/<id>/${FILE} (последний или --round)
  --story <id>       логлайн истории: шапка ink «// логлайн:», иначе поле «логлайн:» решения-ядра в decisions.md
                     (ядро — из STATUS.md); правила там не хранятся — их проверяют на шаге направлений
  --json             то же в JSON

Код выхода 1 — есть ошибка формы, 2 — нечего проверять.`;

const words = (s) => (String(s).match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? []).length;

/** Форма логлайна: длина, «ты», противопоставление. */
export function checkLogline(text, T = thresholds()) {
  const max = T.value('skill.brainstorm.logline.max_words');
  const n = words(text);
  const issues = [];
  if (n > max) issues.push({ level: 'warning', what: `логлайн ${n} слов (> ${max}, skill.brainstorm.logline.max_words)` });
  if (!T.re('dict.player_role').test(text)) {
    // «игрок» в третьем лице — роль названа, но не так, как её услышит игрок: форма R-02 — «ты — X»
    if (/(^|[^\p{L}])игрок/iu.test(text)) issues.push({ level: 'warning', what: 'роль игрока в третьем лице («игрок…») — форма R-02: «ты — X»' });
    else issues.push({ level: 'error', what: 'в логлайне нет роли игрока («ты / тебе / тебя») — R-02, R-06' });
  }
  if (!T.re('dict.logline_irony').test(text)) issues.push({ level: 'warning', what: 'нет противопоставления («но / а / хотя / =») — нет иронии, R-02' });
  return { text, words: n, issues };
}

/** Ядро-правило: число правил, длина каждого, правило, а не событие. */
export function checkRules(rules, T = thresholds()) {
  const maxRules = T.value('skill.brainstorm.rule.max_rules');
  const maxWords = T.value('skill.brainstorm.rule.max_words');
  const issues = [];
  if (rules.length > maxRules) issues.push({ level: 'warning', what: `правил ${rules.length} (> ${maxRules}, skill.brainstorm.rule.max_rules) — одно допущение на историю, R-05` });
  const items = rules.map((r) => {
    const n = words(r);
    const own = [];
    if (n > maxWords) own.push({ level: 'warning', what: `«${r}»: ${n} слов (> ${maxWords}, skill.brainstorm.rule.max_words)` });
    if (T.re('dict.rule_event').test(r)) own.push({ level: 'warning', what: `«${r}»: похоже на событие, а не правило — «…и так будет снова» звучит ли? (R-04)` });
    issues.push(...own);
    return { rule: r, words: n };
  });
  return { rules: items, issues };
}

/** Правила из поля «ядро-правило»: метка до « — », несколько правил — через «;» или «/». */
export const splitRules = (val) => String(val ?? '').split(/\s+—\s+/)[0].split(/\s*[;/]\s*/).map((x) => x.trim()).filter(Boolean);

function fromStory(id) {
  const ink = (() => { try { return parseInk(loadStory(id).ink).head?.['логлайн'] ?? null; } catch { return null; } })();
  if (ink) return { source: `src/stories/${id}: шапка «// логлайн:»`, logline: ink };
  const status = join(STATE_DIR, id, 'STATUS.md');
  const decisions = join(STATE_DIR, id, 'decisions.md');
  if (!existsSync(decisions)) return null;
  const core = existsSync(status) ? readFileSync(status, 'utf8').match(/^\s*-\s*ядро:\s*(D-\d+)/m)?.[1] : null;
  const text = readFileSync(decisions, 'utf8');
  const parts = text.split(/^(?=##\s*D-\d+)/m);
  const block = (core && parts.find((p) => p.startsWith(`## ${core}`))) ?? parts.filter((p) => /^\s*-\s*логлайн:/m.test(p)).at(-1);
  const logline = block?.match(/^\s*-\s*логлайн:\s*(.+)$/m)?.[1]?.trim();
  return logline ? { source: `${decisions}: ${block.match(/D-\d+/)?.[0] ?? 'решение'} «логлайн:»`, logline } : null;
}

async function main(args) {
  const json = args.has('json');
  const T = thresholds();
  const results = [];
  if (args.get('logline')) results.push({ id: 'логлайн', ...checkLogline(args.get('logline'), T), ...checkRules(args.all('rule').map(String), T) });
  if (args.get('directions')) {
    const file = join(STATE_DIR, args.get('directions'), FILE);
    if (!existsSync(file)) { console.log(`нет данных: ${file} не найден`); return 2; }
    const rounds = parseRounds(readFileSync(file, 'utf8'));
    const round = args.get('round') ? rounds.find((r) => r.n === Number(args.get('round'))) : rounds.at(-1);
    if (!round) { console.log(`нет данных: в ${file} нет раунда`); return 2; }
    for (const d of round.directions) {
      const l = d.logline ? checkLogline(d.logline, T) : { text: null, words: 0, issues: [{ level: 'error', what: 'нет логлайна' }] };
      const r = checkRules(splitRules(d.axes.rule), T);
      results.push({ id: `${round.n}${d.id} · ${d.title}`, ...l, rules: r.rules, issues: [...l.issues, ...r.issues] });
    }
  }
  if (args.get('story') && args.get('story') !== true) {
    for (const id of String(args.get('story')).split(',')) {
      const s = fromStory(id);
      if (!s) { results.push({ id, text: null, words: 0, issues: [{ level: 'error', what: `нет данных: логлайна нет ни в шапке ink, ни в решении-ядре ${STATE_DIR}/${id}/decisions.md` }] }); continue; }
      results.push({ id, source: s.source, ...checkLogline(s.logline, T) });
    }
  }
  if (!results.length) { console.log('нечего проверять: --logline, --directions или --story (см. --help)'); return 2; }
  const bad = results.some((r) => r.issues.some((i) => i.level === 'error'));
  if (json) { console.log(JSON.stringify({ ok: !bad, results }, null, 1)); return bad ? 1 : 0; }
  for (const r of results) {
    console.log(`${r.id}${r.source ? ` (${r.source})` : ''}: логлайн ${r.words} слов${r.rules?.length ? `; правил ${r.rules.length}: ${r.rules.map((x) => `«${x.rule}» ${x.words}`).join(', ')}` : ''}`);
    if (r.text) console.log(`  «${r.text}»`);
    for (const i of r.issues) console.log(`  ${i.level === 'error' ? '✗' : '⚠'} ${i.what}`);
    if (!r.issues.length) console.log('  ✓ форма в порядке; иронию по смыслу проверь по patterns-premise.md');
  }
  return bad ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCli(HELP, main);
