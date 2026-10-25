// Кластеры тем и владельцы строк матрицы.
// Первичная разметка (flow-review.md §C «Кластеры»): «Источники» правил rules.md и согласия for-relayer.md.
// Строка входит в первую группу, которая её назвала: если сливать группы по общим ID, согласия цепляются друг
// за друга и почти вся база слипается в один кластер. Владелец — из owners.md: R/C/F/якоря по ID, строки
// базы — по TH-NN своей «опоры» или «опоры» кластера (_build/reports/T-10/requests.md, п. 4).
import { refsIn, BASE_KINDS } from './kb-rows.mjs';
import { targetOf } from './kb-owners.mjs';

const thNum = (th) => Number(th.slice(3));

/** Группы-кандидаты: правило со своими источниками, затем пункты согласий по порядку разборов. */
function groups(rows, agree) {
  const out = [];
  for (const r of rows.filter((x) => x.kind === 'R')) {
    const refs = refsIn(r.sources ?? '', null).filter((x) => !x.bare).map((x) => `${x.alias}:${x.id}`);
    out.push({ head: r.id, title: r.title, from: `rules.md ${r.id}`, members: [r.id, ...refs] });
  }
  for (const a of agree) {
    const members = refsIn(a.text, a.alias).map((x) => `${x.alias}:${x.id}`);
    if (!members.length) continue;
    const title = a.text.match(/(?:\*\*|\*|_)([^*_]{3,}?)[.:]?(?:\*\*|\*|_)/)?.[1] ?? a.text.replace(/[|`*_-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    out.push({ head: members[0], title: title.trim(), from: `${a.alias}/for-relayer.md:${a.line}`, members });
  }
  // Флаг, приём и урок обычно называют свой принцип («почему хорошо (P-01)»): тогда они в его кластере.
  for (const r of rows.filter((x) => ['PAT', 'GREEN', 'RED', 'LESSON'].includes(x.kind))) {
    const p = refsIn(r.text ?? '', r.alias).find((x) => x.id.startsWith('P-'));
    if (p) out.push({ head: `${p.alias}:${p.id}`, title: r.title, from: 'ссылка на принцип', members: [`${p.alias}:${p.id}`, r.id] });
  }
  return out;
}

/**
 * Автоматические кластеры. `manual.move` — ручные переносы ревьюера: { строка: кластер } или { строка: "" }
 * (вынуть в одиночку). Кластер из одной строки в файл не пишется: одиночка — кластер сама себе.
 */
export function buildClusters(rows, agree, manual = {}) {
  const ids = new Set(rows.filter((r) => BASE_KINDS.includes(r.kind) || r.kind === 'R').map((r) => r.id));
  const owner = new Map();
  const clusters = new Map();
  for (const g of groups(rows, agree)) {
    const members = [...new Set(g.members)].filter((m) => ids.has(m));
    if (!members.length) continue;
    // К чужому кластеру пункт пристраивается только головой: по любому общему ID кластеры снова слипнутся.
    let id = owner.get(g.head) ?? null;
    if (!id) {
      if (members.filter((m) => !owner.has(m)).length < 2) continue;
      id = `K-${g.head}`;
      clusters.set(id, { id, title: g.title, from: [g.from], members: [] });
    } else if (!clusters.get(id).from.includes(g.from)) clusters.get(id).from.push(g.from);
    for (const m of members) {
      if (owner.has(m)) continue;
      owner.set(m, id);
      clusters.get(id).members.push(m);
    }
  }
  for (const [row, to] of Object.entries(manual.move ?? {})) {
    const from = owner.get(row);
    if (from) clusters.get(from).members = clusters.get(from).members.filter((m) => m !== row);
    if (!to) owner.delete(row);
    else {
      if (!clusters.has(to)) clusters.set(to, { id: to, title: manual.title?.[to] ?? row, from: ['manual'], members: [] });
      clusters.get(to).members.push(row);
      owner.set(row, to);
    }
  }
  for (const [id, title] of Object.entries(manual.title ?? {})) if (clusters.has(id)) clusters.get(id).title = title;
  return [...clusters.values()].filter((c) => c.members.length > 1).map((c) => ({ ...c, members: c.members.sort(byId) }));
}

/** Порядок ID: свод, затем база по алиасу и номеру. */
export function byId(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Голос большинства за TH-NN; ничья — меньший номер (как у пересечений «опоры», owners.md §5). */
function vote(ths) {
  const count = new Map();
  for (const { th, w } of ths) count.set(th, (count.get(th) ?? 0) + w);
  let best = null;
  for (const [th, n] of count) {
    if (!best || n > best.n || (n === best.n && thNum(th) < thNum(best.th))) best = { th, n };
  }
  return best?.th ?? null;
}

/**
 * Кластер, тема и владелец каждой строки.
 * via: id — по ID в owners.md; opora — строка в «опоре» TH; cluster — по «опоре» соседей по кластеру;
 * parent — нюанс берёт тему своего P; refs — по ссылкам в тексте строки; attn — раздел attention по
 * якорю attention-merged.md, который его цитирует; manual — clusters.json.
 */
export function assignOwners({ rows, clusters, opora, units, manual = {} }) {
  const byRow = new Map(rows.map((r) => [r.id, r]));
  const clusterOf = new Map();
  for (const c of clusters) for (const m of c.members) clusterOf.set(m, c);
  const direct = (id) => opora.get(id) ?? null;

  const clusterTh = new Map();
  for (const c of clusters) {
    const th = manual.th?.[c.id] ?? vote(c.members.map(direct).filter(Boolean).map((o) => ({ th: o.th, w: o.weak ? 0.5 : 1 })));
    clusterTh.set(c.id, th);
  }
  const refsTh = (r) => {
    const refs = refsIn(`${r.title ?? ''}\n${r.text ?? ''}`, r.alias).map((x) => `${x.alias}:${x.id}`).filter((x) => x !== r.id);
    return vote(refs.map((x) => direct(x) ?? (clusterOf.has(x) ? { th: clusterTh.get(clusterOf.get(x).id) } : null)).filter((o) => o?.th).map((o) => ({ th: o.th, w: 1 })));
  };

  // Раздел attention разборов → якорь сводного файла, который на него ссылается чаще.
  const attnOf = new Map();
  for (const a of rows.filter((r) => r.kind === 'attn')) {
    for (const m of a.text.matchAll(/([a-z][a-z0-9-]+):attention§(\d+)/g)) {
      const id = `${m[1]}:attention§${m[2]}`;
      if (!attnOf.has(id)) attnOf.set(id, new Map());
      attnOf.get(id).set(a.id, (attnOf.get(id).get(a.id) ?? 0) + 1);
    }
  }

  const out = new Map();
  const put = (r, cluster, th, via, unitId = th) => {
    const unit = unitId ? units.get(unitId) : null;
    const owner = unit?.owner || null;
    out.set(r.id, { cluster, th: th ?? null, via: owner ? via : null, owner_skill: owner, target: owner ? targetOf(unit, r.id) : null });
  };
  for (const r of rows) {
    const c = clusterOf.get(r.id);
    const cluster = c?.id ?? r.id;
    if (manual.th?.[r.id]) {
      put(r, cluster, manual.th[r.id], 'manual');
      continue;
    }
    if (['R', 'C', 'F', 'attn'].includes(r.kind)) {
      put(r, cluster, direct(r.id)?.th ?? null, 'id', r.id);
      continue;
    }
    const d = direct(r.id);
    if (d) {
      put(r, cluster, d.th, 'opora');
      continue;
    }
    if (c && clusterTh.get(c.id)) {
      put(r, cluster, clusterTh.get(c.id), 'cluster');
      continue;
    }
    if (r.kind === 'nuance') {
      const p = direct(r.parent);
      const pc = clusterOf.get(r.parent);
      const th = p?.th ?? (pc ? clusterTh.get(pc.id) : null);
      if (th) {
        put(r, cluster, th, 'parent');
        continue;
      }
    }
    if (r.kind === 'attention' && attnOf.has(r.id)) {
      const [anchor] = [...attnOf.get(r.id)].sort((a, b) => b[1] - a[1]);
      put(r, cluster, null, 'attn', anchor[0]);
      continue;
    }
    const th = refsTh(r);
    if (th) {
      put(r, cluster, th, 'refs');
      continue;
    }
    // Противоречие без ссылок на темы — в общий индекс противоречий story-kb (owners.md TH-106).
    if (r.kind === 'contra' && units.has('TH-106')) {
      put(r, cluster, 'TH-106', 'contra-index');
      continue;
    }
    put(r, cluster, null, null);
  }
  for (const [id, o] of out) if (!byRow.has(id)) out.delete(id);
  return out;
}
