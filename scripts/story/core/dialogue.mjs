// Реплики узла как переписка, без прохождения: всё, что узел может показать, по порядку текста.
// Нужна story:diff --text — сравнить, что игрок читал в узле до правки и после.

/** Строки переписки узла: реплики, кнопки, условия отступом. Код, переходы и комментарии не видны игроку. */
export function nodeDialogue(knot, contacts) {
  const name = (who) => contacts[who]?.name ?? who ?? '?';
  const out = [];
  const visit = (items, pad) => {
    for (const it of items) {
      if (it.type === 'msg') out.push(`${pad}${name(it.who)}: ${'photo' in (it.tags ?? {}) ? '[фото] ' : ''}${it.text}`);
      else if (it.type === 'me') out.push(`${pad}Вы: ${it.text}`);
      else if (it.type === 'sys') out.push(`${pad}· ${it.text}`);
      else if (it.type === 'choice') {
        const tags = it.tags ?? {};
        out.push(`${pad}[ ${it.text || '…'} ]${'silent' in tags ? ' (молчание)' : ''}${it.conds?.length ? ` если ${it.conds.join(' и ')}` : ''}`);
        visit(it.items, `${pad}  `);
      } else if (it.type === 'cond') {
        for (const b of it.branches) {
          out.push(`${pad}‹${b.cond ?? 'иначе'}›`);
          visit(b.items, `${pad}  `);
        }
      }
    }
  };
  visit(knot.items, '');
  return out;
}

/** Все узлы дерева → Map(id → { chapter, lines }). */
export function dialogueMap(tree) {
  return new Map(tree.knots.map((k) => [k.id, { chapter: k.chapter, lines: nodeDialogue(k, tree.contacts) }]));
}

/**
 * Построчное сравнение (наибольшая общая подпоследовательность): [{ op: ' ' | '-' | '+', text }].
 * Узлы короткие, квадратичной таблицы хватает; на огромном узле — целиком «было / стало».
 */
export function lineDiff(a, b) {
  const n = a.length;
  const m = b.length;
  if (n * m > 4e6) return [...a.map((text) => ({ op: '-', text })), ...b.map((text) => ({ op: '+', text }))];
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ op: ' ', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ op: '-', text: a[i++] });
    else out.push({ op: '+', text: b[j++] });
  }
  while (i < n) out.push({ op: '-', text: a[i++] });
  while (j < m) out.push({ op: '+', text: b[j++] });
  return out;
}

/** Куски изменений с context строками вокруг; пропуски — { op: '…', skipped }. */
export function hunks(diff, context) {
  const keep = diff.map((d, i) => d.op !== ' ' || diff.slice(Math.max(0, i - context), i + context + 1).some((x) => x.op !== ' '));
  const out = [];
  let skipped = 0;
  diff.forEach((d, i) => {
    if (keep[i]) {
      if (skipped) { out.push({ op: '…', skipped }); skipped = 0; }
      out.push(d);
    } else skipped++;
  });
  if (skipped) out.push({ op: '…', skipped });
  return out;
}
