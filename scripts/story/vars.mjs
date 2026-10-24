// story:vars — переменные истории: где пишется → где читается, мёртвые, невидимые.
import { runCli, table } from './core/cli.mjs';
import { prepare } from './core/run.mjs';
import { varIndex } from './core/vars-index.mjs';

const HELP = `npm run story:vars -- [--story <id>] [--only <метка>] [--var <имя>] [--json]

Статический индекс переменных (checks.md, «Общие данные»): для каждой VAR — записи и чтения
с узлом и главой. Чтение засчитывается в условиях, подстановках {x}, правых частях ~ и аргументах
функций; функции приписываются узлу, который их вызывает. Если y пишется внутри условия на x,
чтения y засчитываются и x (одна ступень производных).

Вид чтения:
  реплика   условие, ветка которого выводит реплику или кнопку      — игрок видит
  текст     подстановка в тексте реплики или кнопки {x}, {x: а|б}   — игрок видит
  кнопка    условие на кнопке * {x} […]                             — игрок видит
  переход   условие, ветка которого только делает ->                 — скрытая проверка
  код       правая часть ~ y = … x …                                 — скрытая проверка
  функция   внутри функции, вызванной в скрытом месте                — скрытая проверка

Метки:
  мёртвая       пишется, но нигде не читается (C-01)
  невидимая     читается только скрытыми проверками: игрок не видит, что выбор что-то значил
  только финал  пишется до последней главы, а читается лишь в финалах, распределителях
                или последней главе (C-03)
  не пишется    только начальное значение: флаг, который никто не ставит

  --story <id>  история или несколько через запятую; по умолчанию все из src/stories
  --only <метка> только переменные с меткой (мёртвая, невидимая, «только финал», «не пишется»)
  --var <имя>   подробно по одной переменной: каждая запись и каждое чтение
  --json        всё данными
  --help        эта справка`;

const where = (list, n = 4) => {
  const by = new Map();
  for (const x of list) by.set(x.node, (by.get(x.node) ?? 0) + 1);
  const parts = [...by].map(([node, c]) => (c > 1 ? `${node}×${c}` : node));
  return parts.length > n ? `${parts.slice(0, n).join(', ')} +${parts.length - n}` : parts.join(', ') || '—';
};

runCli(HELP, async (args) => {
  const json = args.has('json');
  const only = args.get('only');
  const one = args.get('var');
  const report = [];
  for (const ref of args.refs) {
    const p = prepare(ref);
    const idx = varIndex(p.tree);
    let list = idx.vars;
    if (only) list = list.filter((v) => v.flags.includes(only));
    if (one) {
      list = list.filter((v) => v.name === one);
      if (!list.length) throw new Error(`${p.story.path}: нет переменной «${one}»`);
    }
    const counts = Object.fromEntries(['мёртвая', 'невидимая', 'только финал', 'не пишется'].map((f) => [f, idx.vars.filter((v) => v.flags.includes(f)).length]));
    report.push({
      id: p.story.id, path: p.story.path, chapters: idx.lastChapter,
      final: [...idx.final], distributors: [...idx.distributors], counts, vars: list,
    });
    if (json) continue;
    console.log(`${p.story.path} · переменных ${idx.vars.length} · глав ${idx.lastChapter}`);
    console.log(`   финальные узлы: ${[...idx.final].join(', ') || '—'} · распределители: ${[...idx.distributors].join(', ') || '—'}`);
    if (one) {
      const v = list[0];
      console.log(`\n${v.name} = ${v.init} · ${v.flags.join(', ') || 'без меток'}`);
      for (const w of v.writes) console.log(`   пишется  гл.${w.chapter} ${w.node}${w.line ? `:${w.line}` : ''}${w.via ? ` (через ${w.via})` : ''}`);
      for (const r of v.reads) console.log(`   читается гл.${r.chapter} ${r.node}${r.line ? `:${r.line}` : ''} — ${r.kind}${r.via ? ` (через ${r.via})` : ''}`);
      if (v.derivedFrom.length) console.log(`   пишется под условием на: ${v.derivedFrom.join(', ')}`);
      if (v.feeds.length) console.log(`   решает запись в: ${v.feeds.join(', ')}`);
      console.log('');
      continue;
    }
    const rows = list.map((v) => [
      v.name, v.writes.length, `${v.visibleReads}/${v.hiddenReads}`,
      `${v.firstWrite ?? '—'}→${v.firstVisible ?? v.firstRead ?? '—'}`, v.readByFinal ? 'да' : '',
      v.flags.join(', '), `${where(v.writes)} → ${where(v.reads)}`,
    ]);
    console.log('');
    console.log(table(rows, ['VAR', 'пиш.', 'видно/скрыто', 'главы', 'финал', 'метки', 'где пишется → где читается']).replace(/^/gm, '   '));
    console.log(`\n   мёртвых ${counts['мёртвая']} · невидимых ${counts['невидимая']} · только в финале ${counts['только финал']} · не пишутся ${counts['не пишется']}\n`);
  }
  if (json) console.log(JSON.stringify({ stories: report }, null, 1));
});
