// Персоны story:trace. Каждая — фабрика стратегии bot.play: (choices, ctx) → индекс в choices.
// Фабрика вызывается на каждое прохождение, поэтому память персоны (что уже спрашивал) не течёт между прогонами.
import { ASK, LEAVE, REFUSE, SUSPECT, TRUST } from './lexicon.mjs';

/** Теги кнопки из рантайма inkjs → { silent: '', to: 'dina', label: '…' }. */
export function choiceTags(c) {
  const out = {};
  for (const raw of c.tags ?? []) {
    const i = raw.indexOf(':');
    if (i < 0) out[raw.trim()] = '';
    else out[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
  }
  return out;
}

// кнопка из рантайма inkjs (теги) или из хронологии (поле silent)
const isSilent = (c) => c.silent === true || 'silent' in choiceTags(c);
const said = (c) => `${choiceTags(c).label ?? ''} ${c.text}`;

/**
 * Куда идёт история, если игрок не ответил. До E-02 напоминаний нет, и по решению свода (R-120)
 * «не ответил» по умолчанию — это #silent той же развилки. Без #silent идти некуда: −1, история стоит.
 * E-02 расширит bot.mjs синтаксисом напоминаний, и эта функция начнёт отдавать их ветку.
 */
export function noAnswer(choices) {
  return choices.findIndex(isSilent);
}

const pickBy = (choices, ctx, score) => {
  let best = -Infinity;
  let pool = [];
  choices.forEach((c, i) => {
    const s = score(c, i);
    if (s > best) { best = s; pool = [i]; } else if (s === best) pool.push(i);
  });
  return pool[Math.floor(ctx.rng() * pool.length)];
};

const random = () => (choices, ctx) => Math.floor(ctx.rng() * choices.length);

export const PERSONAS = {
  random: {
    name: 'случайная',
    about: 'каждая кнопка равновероятна',
    make: random,
  },
  silent: {
    name: 'молчун',
    about: '#silent, где он есть; иначе самая короткая кнопка',
    make: () => (choices, ctx) => {
      const s = choices.findIndex(isSilent);
      return s >= 0 ? s : pickBy(choices, ctx, (c) => -c.text.length);
    },
  },
  first: {
    name: 'первая кнопка',
    about: 'всегда первая: основной путь, как его видит автор',
    deterministic: true,
    make: () => () => 0,
  },
  last: {
    name: 'последняя кнопка',
    about: 'всегда последняя',
    deterministic: true,
    make: () => (choices) => choices.length - 1,
  },
  refuse: {
    name: 'отказ',
    about: 'кнопка с отказом (по #label и тексту: «нет», «не буду»…); нет отказа — #silent; нет и его — случайная',
    make: () => (choices, ctx) => {
      const r = choices.findIndex((c) => REFUSE.test(said(c)));
      if (r >= 0) return r;
      const s = choices.findIndex(isSilent);
      return s >= 0 ? s : random()(choices, ctx);
    },
  },
  curious: {
    name: 'любопытный',
    about: 'сначала ещё не нажатые кнопки с вопросом, выход из хаба («дальше», «хватит») — последним',
    make: () => {
      const taken = new Set();
      return (choices, ctx) => {
        const i = pickBy(choices, ctx, (c) => {
          const text = said(c);
          return (taken.has(c.text) ? -4 : 0) + (ASK.test(text) ? 2 : 0) - (LEAVE.test(text) ? 3 : 0) - (isSilent(c) ? 1 : 0);
        });
        taken.add(choices[i].text);
        return i;
      };
    },
  },
  trusting: {
    name: 'доверчивый',
    about: 'соглашается и выполняет просьбы («да», «давай», «отправлю»), избегает отказа и допроса',
    make: () => (choices, ctx) => pickBy(choices, ctx, (c) => {
      const t = said(c);
      return (TRUST.test(t) ? 2 : 0) - (REFUSE.test(t) ? 2 : 0) - (SUSPECT.test(t) ? 1 : 0);
    }),
  },
  suspicious: {
    name: 'подозрительный',
    about: 'переспрашивает и проверяет («кто ты», «докажи», «зачем»), отказывает, если проверять нечего',
    make: () => (choices, ctx) => pickBy(choices, ctx, (c) => {
      const t = said(c);
      return (SUSPECT.test(t) ? 3 : 0) + (REFUSE.test(t) ? 1 : 0) - (TRUST.test(t) ? 1 : 0);
    }),
  },
  distracted: {
    name: 'отвлечённый',
    about: 'кнопки как у случайной, но уходит на каждой паузе от trace.distracted_away и возвращается, когда пачка сообщений дошла до кнопки',
    away: true,
    make: random,
  },
  unresponsive: {
    name: 'неотвечающий',
    about: 'не отвечает: история идёт веткой «не ответил» (до E-02 — #silent); где #silent нет, история стоит — отмечается, дальше случайная кнопка',
    noAnswer: true,
    make: () => (choices, ctx) => {
      const i = noAnswer(choices);
      return i >= 0 ? i : random()(choices, ctx);
    },
  },
};

export const PERSONA_IDS = Object.keys(PERSONAS);

/** «all» или список через запятую → id персон; неизвестное имя — ошибка с подсказкой. */
export function parsePersonas(value, fallback = ['random']) {
  if (!value) return fallback;
  if (value === 'all') return PERSONA_IDS;
  const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) if (!PERSONAS[id]) throw new Error(`нет персоны «${id}». Есть: ${PERSONA_IDS.join(', ')}`);
  return ids;
}
