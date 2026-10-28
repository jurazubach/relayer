// ideas-bank — что уже было: банк идей всех историй (story-desk, idea-park.mjs), показанные и отвергнутые
// направления прошлых раундов и истории каталога. Нужен до генерации: новое направление не должно повторять
// отвергнутое по той же причине или готовую историю (flow-review.md §A шаг 1, план §7 «банк общий»).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listStories, loadStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import { STATE_DIR } from '../../../../scripts/story/core/state.mjs';
import { FILE, parseRounds, stems } from './directions.mjs';

const IDEA_PARK = fileURLToPath(new URL('../../story-desk/scripts/idea-park.mjs', import.meta.url));

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/ideas-bank.mjs --query "<сырая идея или направление>" [--top N] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/ideas-bank.mjs --list [--json]

Что уже было, по трём источникам:
  · банк идей ${STATE_DIR}/*/ideas.md — через story-desk (idea-park.mjs --list --json): причина «не взято»
    и «когда вернуться» — можно ли достать идею для новой истории;
  · раунды направлений ${STATE_DIR}/*/${FILE} — показанное, выбранное и отвергнутое;
  · каталог src/stories/* — название, tagline, synopsis, затравки: не повторять готовую историю.

  --query   похожие записи: доля общих основ слов от меньшего текста ≥ skill.brainstorm.bank.similar_min
  --top N   сколько показать (по умолчанию все похожие)
  --list    сводка: сколько идей в банке, направлений в раундах, историй в каталоге
  --json    то же в JSON

Поиск по словам, а не по смыслу: «похоже» — повод открыть запись, а не вывод. Банк пуст — так и скажи.`;

const STOP = new Set(['котор', 'чтобы', 'когда', 'тольк', 'посл', 'перед', 'межд', 'через', 'этого', 'может', 'нужно', 'игрок', 'истор', 'сообщ', 'тебе', 'тебя', 'свое', 'своей', 'него', 'неё', 'нее', 'есть', 'было', 'будет']);
const bag = (text) => stems(text).filter((s) => s.length >= 4 && !STOP.has(s));

/** Банк story-desk: его парсер и есть формат, свой не пишем. */
export function bankIdeas() {
  const r = spawnSync('node', [IDEA_PARK, '--list', '--json'], { encoding: 'utf8' });
  if (r.status !== 0) return { error: `нет данных: idea-park.mjs --list (${(r.stderr || r.stdout).trim().split('\n')[0]})`, ideas: [] };
  const j = JSON.parse(r.stdout);
  return { ideas: j.ideas.map((x) => ({ source: 'банк', story: x.story, id: x.id, kind: x.kind, text: x.text, why: x.why, when: x.when, state: x.state })) };
}

export function roundDirections() {
  if (!existsSync(STATE_DIR)) return [];
  const out = [];
  for (const id of readdirSync(STATE_DIR).sort()) {
    const f = join(STATE_DIR, id, FILE);
    if (id.startsWith('.') || id.startsWith('_') || !statSync(join(STATE_DIR, id)).isDirectory() || !existsSync(f)) continue;
    for (const r of parseRounds(readFileSync(f, 'utf8'))) {
      for (const d of r.directions) {
        out.push({ source: 'раунд', story: id, id: `${r.n}${d.id}`, kind: 'направление', text: [d.title, d.logline, ...Object.values(d.labels)].filter(Boolean).join(' · '), why: /отверг/.test(d.status) ? d.status : null, when: null, state: d.status });
      }
    }
  }
  return out;
}

export function catalog() {
  return listStories().map((p) => {
    try {
      const s = loadStory(p);
      const m = s.meta ?? {};
      return { source: 'каталог', story: s.id, id: null, kind: 'история', text: [m.series, m.title, m.tagline, m.synopsis, ...(m.teasers ?? [])].filter(Boolean).join(' · '), why: null, when: null, state: 'готова' };
    } catch (e) {
      return { source: 'каталог', story: p, id: null, kind: 'история', text: '', why: `не читается: ${e.message}`, when: null, state: '—' };
    }
  });
}

/** Похожесть: доля общих основ от меньшего текста — короткая идея против длинного synopsis. */
export function similarity(a, b) {
  const x = bag(a);
  const y = new Set(bag(b));
  if (!x.length || !y.size) return { score: 0, common: [] };
  const common = [...new Set(x.filter((s) => y.has(s)))];
  return { score: common.length / Math.min(new Set(x).size, y.size), common };
}

async function main(args) {
  const json = args.has('json');
  const bank = bankIdeas();
  const all = [...bank.ideas, ...roundDirections(), ...catalog()];
  if (args.has('list') || !args.get('query')) {
    const count = (src) => all.filter((x) => x.source === src).length;
    const summary = { bank: count('банк'), bank_open: all.filter((x) => x.source === 'банк' && !/^взят/i.test(x.state ?? '')).length, rounds: count('раунд'), rejected: all.filter((x) => x.source === 'раунд' && x.why).length, catalog: count('каталог'), error: bank.error ?? null };
    if (json) { console.log(JSON.stringify({ ...summary, items: all }, null, 1)); return 0; }
    if (bank.error) console.log(bank.error);
    console.log(`банк идей: ${summary.bank} (в банке ${summary.bank_open}) · направлений в раундах: ${summary.rounds} (отвергнуто ${summary.rejected}) · историй в каталоге: ${summary.catalog}`);
    if (all.length) console.log(`\n${table(all.map((x) => [x.source, x.story, x.id ?? '—', x.text.slice(0, 70), (x.why ?? '').slice(0, 40)]), ['где', 'история', 'ID', 'что', 'не взято'])}`);
    return 0;
  }
  const q = String(args.get('query'));
  const min = thresholds().value('skill.brainstorm.bank.similar_min');
  let hits = all.map((x) => ({ ...x, ...similarity(q, x.text) })).filter((x) => x.score >= min).sort((a, b) => b.score - a.score);
  if (args.get('top')) hits = hits.slice(0, Number(args.get('top')));
  if (json) { console.log(JSON.stringify({ query: q, min, searched: all.length, error: bank.error ?? null, hits }, null, 1)); return 0; }
  if (bank.error) console.log(bank.error);
  console.log(`«${q}»: просмотрено ${all.length} (банк, раунды, каталог); похожих ${hits.length} (порог ${min}, skill.brainstorm.bank.similar_min)`);
  if (!hits.length) { console.log('похожего нет: идея новая для банка и каталога'); return 0; }
  console.log(`\n${table(hits.map((x) => [x.score.toFixed(2), x.source, x.story, x.id ?? '—', x.text.slice(0, 60), (x.why ?? x.state ?? '').slice(0, 36), x.common.slice(0, 5).join(' ')]), ['доля', 'где', 'история', 'ID', 'что', 'причина / статус', 'общие основы'])}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCli(HELP, main, { bool: ['list'] });
