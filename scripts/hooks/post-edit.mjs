// Хук PostToolUse (Write|Edit|MultiEdit|Bash): быстрая проверка истории, которую только что тронули.
// Модели ответ уходит через hookSpecificOutput.additionalContext: обычный stdout она не видит
// (claude-code-format.md §3.3). Код выхода всегда 0 — правка уже сделана, блокировать нечего.
import { readFileSync } from 'node:fs';
import { changedSince, checkStory, clip, counts, findingLine, fingerprint, isPartial, MAX_FINDINGS, sessionState, storyExists, storyOfPath, storySnapshot } from './core.mjs';

const HELP = `node scripts/hooks/post-edit.mjs < вход-хука.json

Хук PostToolUse из .claude/settings.json. Читает JSON хука со stdin и, если правка задела
src/stories/<id>/ (Write, Edit, MultiEdit — по tool_input.file_path; Bash — по git status
src/stories), гоняет быстрый режим: check:story по истории и story:lint --changed --quick --summary.
История с узлом beta_stop (часть глав, набор для теста) проверяется с --partial: обрыв части — не тупик.
Модели возвращает короткий отчёт в hookSpecificOutput.additionalContext: новые ошибки целиком,
о прежних — только число. Полный отчёт — node scripts/hooks/full.mjs <id>.

  RELAYER_HOOKS=off   выключить хук (например, на время массовой правки)
  --help              эта справка`;

if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(HELP); process.exit(0); }
if (process.env.RELAYER_HOOKS === 'off') process.exit(0);

// Режим по agent_type: агент главы правит часто, ему — только быстрый. Главной сессии и прочим тоже
// быстрый: полный прогон дорог для каждой правки, его зовут по окончании главы (full.mjs).
// partial — быстрый с story:lint --partial: агент главы пишет главы 1–2 с заглушкой beta_stop, и без него
// хук ругался бы на «финал» в заглушке и на всё, что бывает только в целой истории. Включается сам по
// узлу beta_stop (isPartial), для любого агента; checkStory сам смотрит isPartial, и полный режим его не теряет.
const MODE_BY_AGENT = { 'chapter-writer': 'quick' };
const modeFor = (agent, id) => {
  const mode = MODE_BY_AGENT[agent] ?? 'quick';
  return mode === 'quick' && isPartial(id) ? 'partial' : mode;
};

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const tool = input.tool_name ?? '';
const state = sessionState(input.session_id);
const snapshot = storySnapshot();
let ids = [];
if (tool === 'Bash') {
  // Снимок, сделанный на старте сессии, отделяет правки этой сессии от того, что уже лежало незакоммиченным
  if (snapshot && state.data.snapshot) ids = changedSince(state.data.snapshot, snapshot);
} else {
  const id = storyOfPath(input.tool_input?.file_path ?? input.tool_input?.notebook_path);
  if (id && storyExists(id)) ids = [id];
}
if (snapshot) state.data.snapshot = snapshot;
if (!ids.length) { state.save(); process.exit(0); }

const parts = [];
const modes = new Set();
for (const id of ids) {
  const mode = modeFor(input.agent_type, id);
  modes.add(mode);
  parts.push(report(checkStory(id, { quick: mode !== 'full' })));
}
state.save();

const MODE_RU = { quick: 'быстрый режим', partial: 'быстрый режим, часть истории до beta_stop', full: 'полный режим' };
const text = clip(`Хук проверки историй после ${tool} (${[...modes].map((m) => MODE_RU[m]).join('; ')}):\n${parts.join('\n')}`);
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } }));

function report(res) {
  const seen = new Set(state.data.seen[res.id] ?? []);
  // ошибки — всегда; предупреждения — только от check:story (неизвестный тег, слишком длинное сообщение): их мало и их чинят сразу
  const loud = res.findings.filter((f) => f.level === 'error' || (f.level === 'warning' && f.check === 'check:story'))
    .sort((a, b) => (a.level === 'error' ? 0 : 1) - (b.level === 'error' ? 0 : 1));
  const now = new Set(loud.map(fingerprint));
  const fresh = loud.filter((f) => !seen.has(fingerprint(f)));
  const old = loud.length - fresh.length;
  const fixed = [...seen].filter((k) => !now.has(k)).length;
  state.data.seen[res.id] = [...now];

  const c = counts(res.findings);
  const tail = [
    old ? `прежних ${old} (уже сообщалось)` : null,
    fixed ? `исправлено ${fixed}` : null,
    res.compiled ? `предупреждений lint ${c.warning - loud.filter((f) => f.level === 'warning').length}, подсказок ${c.hint}` : null,
  ].filter(Boolean).join(' · ') + (res.byCheck ? `\n  story:lint --summary, ${res.byCheck}` : '');

  // ошибки компиляции повторяем каждый раз: пока история не собирается, остальные проверки молчат
  if (!res.compiled) {
    return [`✗ ${res.id}: не компилируется, остальные проверки не запускались`, ...loud.slice(0, MAX_FINDINGS).map((f) => findingLine(f)), more(loud)].filter(Boolean).join('\n');
  }
  if (!loud.length) return `✓ ${res.id}: компилируется, тупиков и недостижимых узлов нет, ошибок lint нет${tail ? ` · ${tail}` : ''}`;
  if (!fresh.length) return `${res.id}: новых ошибок нет · ${tail} · список: node scripts/hooks/full.mjs ${res.id}`;
  return [
    `✗ ${res.id}: находок, о которых ещё не сообщалось, — ${fresh.length}; почини или пометь «// намеренно: C-NN причина»`,
    ...fresh.slice(0, MAX_FINDINGS).map((f) => findingLine(f)),
    more(fresh),
    `${tail} · весь список: node scripts/hooks/full.mjs ${res.id}`,
  ].filter(Boolean).join('\n');
}

function more(list) {
  return list.length > MAX_FINDINGS ? `  … и ещё ${list.length - MAX_FINDINGS}` : null;
}
