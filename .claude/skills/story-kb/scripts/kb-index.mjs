// Указатель базы: разбор → о чём → темы owners.md → скилл-владелец. Счёт строк, владельцы и темы — из
// матрицы story:coverage, поэтому совпадают с `npm run story:coverage -- --skill <скилл>` и kb-search.mjs.
// Пишет таблицу между метками в references/index.md, ручной текст вокруг не трогает.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix } from '../../../../scripts/kb/coverage.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/kb-index.mjs [--alias <алиас>] [--top N] [--write] [--check] [--json]

Указатель 30 разборов (скилл story-kb, TH-105): о чём разбор, сколько строк, главные темы owners.md
и их владельцы, сколько противоречий и сколько строк отменено решениями автора.

  --alias    один разбор (короткий алиас тоже: nicklin)
  --top N    тем на разбор (по умолчанию 3)
  --write    обновить таблицу в references/index.md (между метками kb-index)
  --check    код 1, если таблица в references/index.md устарела
  --json     всё данными
  --help     эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const top = Number(opt('--top') ?? 3);
const INDEX = join(dirname(fileURLToPath(import.meta.url)), '../references/index.md');
const BEGIN = '<!-- kb-index:begin -->';
const END = '<!-- kb-index:end -->';

// «О чём» — пересказ README разборов своими словами, одной строкой: генерировать его из текста нельзя
// (у части разборов главная мысль включает отменённое, например срок паузы у serial-hooks).
const ABOUT = {
  'ashwell-standard-patterns': 'каталог форм ветвления и цена каждой: сколько текста, что увидит игрок',
  'attention-today': 'что правда о внимании: прерывания вместо «золотой рыбки», сессия переживает обрыв',
  'bateman-game-writing': 'ремесло игрового сценариста: хребет сюжета, подсказки, юмор, работа в команде',
  'chat-fiction-apps': 'чат-фикшн приложения: формат переписки, ожидание, удержание, монетизация',
  'choiceofgames-design': 'виды выборов и отложенные последствия в длинных историях по главам',
  'cron-wired-for-story': 'каждая строка отвечает «и что из этого для героя»; что в нейронауке проверилось',
  'dille-ultimate-guide': 'история как производственный документ: описать и проверить до реплик',
  'edgerton-hooked': 'первая сцена: событие ломает норму, под поверхностной проблемой — глубинная',
  'emshort-structures': 'мелкие структуры выбора внутри сцены и состояние вместо дерева',
  'failbetter-qbn': 'сторилеты и качества: история растёт из условий на немногих переменных',
  'inkle-ingold': 'ink изнутри: поток сверху вниз, частые мелкие выборы, сцены помнят игрока',
  'maass-fire-in-fiction': 'напряжение в каждой строке: два чувства сразу, микронапряжение',
  'mckee-story': 'сцена как смена ценности, кризис-выбор, тема и контроль ожиданий',
  'meaningful-choice': 'четыре компонента ощущения выбора: видно, цена, след, необратимость',
  'messenger-genre': 'истории в мессенджере в реальном времени: паузы, уведомления, голоса чатов',
  'mobile-interactive-stories': 'мобильные визуальные новеллы: эпизоды, премиум-выборы, удержание',
  'mystery-fair-play': 'честная загадка: улики раньше разгадки на любом пути, виновник знаком заранее',
  'narrative-postmortems': 'постмортемы: что сломалось в нарративных играх и как чинили',
  'narrative-testing': 'бот проверяет «не сломано», человек — «хорошо»; бета, QA, тест до прозы',
  'nicklin-writing-for-games': 'словарь ремесла: голос, регистр, форма, упражнения, критический отклик',
  'procedural-storytelling': 'игрок видит только заметные различия: системы и модели, которые пишут текст',
  'schell-art-of-game-design': 'линзы-вопросы к проекту и кривая интереса во времени',
  'serial-hooks': 'обрыв перед перерывом и возвращение после него; износ клиффхэнгеров',
  'sheldon-character-storytelling': 'персонаж в игре: роли, черты, встречи с игроком',
  'skolnick-video-game-storytelling': 'конфликт через действие игрока как можно раньше, без пересказа',
  'snyder-save-the-cat': 'логлайн с иронией и раскадровка битов до текста',
  'truby-anatomy-of-story': 'история от перемены героя: слабость, желание, противник, тема',
  'video-three-things': 'одна-три простые вещи вместо описания мира; начало-генератор',
  'vogler-writers-journey': 'путь героя и архетипы как функции, а не типажи',
  'yorke-into-the-woods': 'симметричная форма «туда — истина в середине — обратно» на всех масштабах',
};

let res;
try {
  res = buildMatrix({});
} catch (e) {
  console.error(`нет данных: матрица story:coverage не собралась (${e.message})`);
  process.exit(2);
}
const { matrix, kb } = res;
const aliases = [...kb.aliases].sort();
const only = opt('--alias') ? kb.resolveAlias(opt('--alias')) : null;
if (opt('--alias') && !only) { console.error(`нет разбора «${opt('--alias')}»`); process.exit(1); }

const entries = aliases.filter((a) => !only || a === only).map((alias) => {
  const rows = matrix.filter((r) => r.alias === alias);
  const byTh = new Map();
  for (const r of rows) if (r.th && r.owner_skill) byTh.set(r.th, (byTh.get(r.th) ?? 0) + 1);
  const themes = [...byTh].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top).map(([th, n]) => {
    const u = kb.units.get(th);
    return { th, topic: u?.topic ?? '', owner: u?.owner ?? null, file: u?.file ?? null, rows: n };
  });
  const owners = new Map();
  for (const r of rows) if (r.owner_skill) owners.set(r.owner_skill, (owners.get(r.owner_skill) ?? 0) + 1);
  return {
    alias,
    about: ABOUT[alias] ?? '',
    rows: rows.length,
    themes,
    owners: [...owners].sort((a, b) => b[1] - a[1]).map(([skill, n]) => ({ skill, rows: n })),
    contra: rows.filter((r) => r.kind === 'contra').length,
    superseded: rows.filter((r) => r.status.startsWith('superseded') || r.partial).length,
  };
});

if (args.includes('--json')) {
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}

const table = [
  '| разбор | о чём | строк | главные темы → владелец | споров | отменено |',
  '|---|---|---|---|---|---|',
  ...entries.map((e) => `| \`${e.alias}\` | ${e.about} | ${e.rows} | ${e.themes.map((t) => `${t.th} ${t.topic} → \`${t.owner}\``).join('; ')} | ${e.contra} | ${e.superseded} |`),
].join('\n');

if (args.includes('--write') || args.includes('--check')) {
  if (!existsSync(INDEX)) { console.error(`нет ${INDEX}`); process.exit(1); }
  const text = readFileSync(INDEX, 'utf8');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a < 0 || b < a) { console.error(`в index.md нет меток ${BEGIN} … ${END}`); process.exit(1); }
  const next = `${text.slice(0, a + BEGIN.length)}\n${table}\n${text.slice(b)}`;
  if (args.includes('--check')) {
    console.log(next === text ? '✓ index.md свежий' : '✗ index.md устарел: kb-index.mjs --write');
    process.exit(next === text ? 0 : 1);
  }
  writeFileSync(INDEX, next);
  console.log(`✓ index.md: ${entries.length} разборов`);
  process.exit(0);
}

for (const e of entries) {
  console.log(`${e.alias} — ${e.about}`);
  console.log(`  строк ${e.rows} · споров ${e.contra} · отменено или частично ${e.superseded}`);
  console.log(`  темы: ${e.themes.map((t) => `${t.th} ${t.topic} → ${t.owner}/${t.file} (${t.rows})`).join('; ')}`);
  console.log(`  владельцы: ${e.owners.map((o) => `${o.skill} ${o.rows}`).join(', ')}`);
}
