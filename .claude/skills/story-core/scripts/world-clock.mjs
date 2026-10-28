// Календарь мира против двух режимов (TH-13, A-02, A-04, A-05): сколько сюжетных дней, где по главам стоит
// время мира, какие стыки глав в реальном времени не уложить паузой ×1 и требуют своей метки «N спустя».
// Время игрока не моделируется: часы в календаре — часы мира. Реальные числа — из npm run story:sessions.
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { STATE_DIR, calendar, dur, npmJson, readCore, readInk, thresholds } from './core-lib.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/world-clock.mjs --story <id> [--draft <файл>] [--dir <папка>] [--json]

Календарь мира по главам из поля ядра «время мира» («гл.1 д1 21:00; гл.2 д2 08:00; гл.3 д2»):
  - размах мира: от первой главы до последней, против story.length.target_h и story.length.max_h;
  - скачок мира на каждом стыке глав: больше story.pause.max_h — паузой ×1 не уложить, нужен свой #sys
    «N спустя» с короткой паузой (story-time, modes.md); от engine.click.time_jump_label в режиме «по клику»
    метку скачка ставит движок;
  - если история уже есть в src/stories: срединное прохождение npm run story:sessions (реальная пауза на
    стыке, время по клику) рядом со скачком мира — где реальная пауза длиннее времени мира и где мир
    прыгает дальше паузы без своей метки (судит модель по тексту);
  - карточка: minutes и days из meta.json против замера (C-31 у story-time — там и находки).

Часы и дни — данные истории (их пишет автор в ядре), не пороги. Часы игрока не известны и не нужны (A-02).

  --story <id>   история (ядро из docs/stories/<id>/, замер — из src/stories/<id>/, если есть)
  --draft <файл> черновик ядра вместо записанного D-NN
  --dir <папка>  где лежит состояние (по умолчанию ${STATE_DIR})
  --json         результат данными`;

runCli(HELP, async (args) => {
  const id = args.get('story');
  if (!id || id === true) throw new Error('нужна --story <id>');
  const draft = args.get('draft');
  const core = readCore(id, { draft: draft === true ? null : draft, dir: args.get('dir', STATE_DIR) });
  const T = thresholds();
  const cal = calendar(core.fields['время мира']);
  const notes = [];
  const H = 3600;

  // мир: абсолютное время главы в минутах от полуночи первого дня; без часов — начало дня
  const at = (c) => ((c.day - 1) * 24 * 60 + (c.minutes ?? 0)) * 60;
  const rows = cal.map((c, i) => {
    const prev = cal[i - 1];
    const gap = prev ? at(c) - at(prev) : null;
    return { chapter: c.chapter, day: c.day, time: c.minutes != null ? `${String(Math.floor(c.minutes / 60)).padStart(2, '0')}:${String(c.minutes % 60).padStart(2, '0')}` : null, world_gap_s: gap };
  });
  const span = cal.length > 1 ? at(cal.at(-1)) - at(cal[0]) : 0;
  if (!cal.length) notes.push(`нет календаря: в ядре ${core.id ?? '—'} поле «время мира» без «гл.N дM [ЧЧ:ММ]» — сначала решить время мира (time-model.md)`);
  for (const r of rows) {
    if (r.world_gap_s == null) continue;
    if (r.world_gap_s < 0) notes.push(`гл.${r.chapter}: время мира идёт назад (${dur(-r.world_gap_s)}) — флешбэк? тогда это не стык, а сцена прошлого, и метка «раньше» своя`);
    else if (r.world_gap_s > T.seconds('story.pause.max_h')) notes.push(`гл.${r.chapter}: мир прыгает на ${dur(r.world_gap_s)} > story.pause.max_h — в реальном времени паузой ×1 не уложить: свой #sys «${dur(r.world_gap_s)} спустя» и короткая пауза`);
  }
  if (span > T.seconds('story.length.max_h')) notes.push(`размах мира ${dur(span)} > story.length.max_h: реальное время ×1 весь календарь не пройдёт — скачки на стыках обязательны, их число и место решает ядро`);
  else if (span > T.seconds('story.length.target_h')) notes.push(`размах мира ${dur(span)} > story.length.target_h: история в реальном времени длиннее цели, если не прыгать на стыках`);

  // замер: срединное прохождение story:sessions, если история уже написана
  let measured = null;
  const ink = readInk(id);
  if (ink) {
    const s = npmJson('story:sessions', ['--story', id]);
    if (s.error) notes.push(s.error);
    else {
      const st = s.stories?.[0];
      const p = st?.personas?.[0];
      const sessions = p?.middle?.sessions ?? [];
      const firstOf = new Map();
      for (const x of sessions) if (!firstOf.has(x.chapter)) firstOf.set(x.chapter, x);
      // глава внутри сессии (без паузы на стыке) своей сессии не открывает — её начало считаем суммой глав до неё
      let sum = 0;
      measured = {
        card: st?.card ?? null,
        real_s: p?.real?.median ?? null,
        click_s: p?.click?.median ?? null,
        chapters: (p?.middle?.chapters ?? []).map((c) => {
          const start = firstOf.get(c.chapter)?.at ?? sum;
          sum = start + (c.real ?? 0);
          return { chapter: c.chapter, start_s: start, seam_pause_s: firstOf.get(c.chapter)?.pauseBefore ?? null, real_s: c.real, click_s: c.click };
        }),
      };
      for (const r of rows) {
        const m = measured.chapters.find((c) => c.chapter === r.chapter);
        if (!m || r.world_gap_s == null) continue;
        r.seam_pause_s = m.seam_pause_s;
        const prev = measured.chapters.find((c) => c.chapter === r.chapter - 1);
        r.real_gap_s = m.start_s != null && prev?.start_s != null ? m.start_s - prev.start_s : null;
        if (r.real_gap_s != null && r.world_gap_s >= 0 && r.real_gap_s - r.world_gap_s >= T.seconds('engine.click.time_jump_label')) notes.push(`гл.${r.chapter}: в реальном времени между началами глав ${dur(r.real_gap_s)}, а в мире ${dur(r.world_gap_s)} — время мира отстаёт от паузы: проверь «доброе утро» и сроки (story-time, clock.md)`);
        else if (r.real_gap_s != null && r.world_gap_s - r.real_gap_s >= T.seconds('engine.click.time_jump_label')) notes.push(`гл.${r.chapter}: мир прыгает на ${dur(r.world_gap_s)}, реальная пауза ${dur(r.real_gap_s)} — нужна своя метка скачка в тексте (#sys «… спустя»), движок её в реальном времени не ставит`);
      }
    }
  }

  const res = { story: id, core: core.source ? core.id : null, days: cal.length ? Math.max(...cal.map((c) => c.day)) : null, span_s: span, calendar: rows, measured, notes };
  if (args.has('json')) { console.log(JSON.stringify(res, null, 2)); return 0; }
  console.log(`${id} · ядро: ${core.id ?? 'нет'} · дней мира: ${res.days ?? '—'} · размах мира: ${cal.length ? dur(span) : '—'}`);
  if (rows.length) {
    console.log('  глава  мир          скачок мира  реальная пауза на стыке  между началами глав');
    for (const r of rows) console.log(`  гл.${String(r.chapter).padEnd(4)} д${r.day}${r.time ? ` ${r.time}` : ''}`.padEnd(22) + `${r.world_gap_s == null ? '—' : dur(r.world_gap_s)}`.padEnd(13) + `${r.seam_pause_s == null ? '—' : dur(r.seam_pause_s)}`.padEnd(25) + `${r.real_gap_s == null ? '—' : dur(r.real_gap_s)}`);
  }
  if (measured && !rows.length) {
    // календаря нет: реальные начала глав срединного прохождения — опора, чтобы восстановить время мира
    console.log('  глава  начало от старта  пауза на стыке  глава по клику');
    for (const c of measured.chapters) console.log(`  гл.${String(c.chapter).padEnd(4)} ${dur(c.start_s).padEnd(17)} ${(c.seam_pause_s ? dur(c.seam_pause_s) : '—').padEnd(15)} ${dur(c.click_s)}`);
  }
  if (measured) console.log(`  замер (story:sessions, медиана): реальное время ${dur(measured.real_s)}, по клику ${dur(measured.click_s)}; карточка: ${measured.card?.minutes ?? '—'} мин · ${measured.card?.days ?? '—'} дн`);
  else console.log('  замера нет: истории ещё нет в src/stories — только календарь ядра');
  for (const n of notes) console.log(`  ⚠ ${n}`);
  if (!notes.length) console.log('  ✓ календарь укладывается в оба режима');
  return 0;
});
