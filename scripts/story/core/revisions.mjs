// История на ревизии git: файлы src/stories/<id> из коммита во временную папку, чтобы нынешние
// команды мерили старую и новую версию одной линейкой (старых команд на старой ревизии может не быть).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { STORIES_DIR, listStories } from '../../lib/story.mjs';

/** Рабочая копия вместо ревизии. */
export const WORKTREE = '.';
export const isWorktree = (ref) => ref === WORKTREE;

const git = (args, opts = {}) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...opts });

/** { ref, sha, short, date, subject } или исключение с понятным текстом. */
export function describeRef(ref) {
  if (isWorktree(ref)) return { ref, sha: null, short: null, date: null, subject: 'рабочая копия' };
  let out;
  try {
    out = git(['log', '-1', '--format=%H%x00%h%x00%cs%x00%s', `${ref}^{commit}`, '--'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(`ревизии «${ref}» нет в git (тег, ветка или коммит; «.» — рабочая копия)`);
  }
  const [sha, short, date, subject] = out.split('\0');
  return { ref, sha, short, date, subject };
}

/** id историй, чьи файлы различаются между ревизиями (вторая может быть рабочей копией). */
export function changedStories(a, b) {
  const args = ['diff', '--name-only', a.sha];
  if (!isWorktree(b.ref)) args.push(b.sha);
  args.push('--', STORIES_DIR);
  const ids = new Set();
  for (const f of git(args, { encoding: 'utf8' }).split('\n').filter(Boolean)) {
    const rest = f.slice(STORIES_DIR.length + 1);
    ids.add(rest.includes('/') ? rest.split('/')[0] : rest.replace(/\.json$/, ''));
  }
  return [...ids].sort();
}

/**
 * Путь к истории на ревизии или null, если её там нет. Для рабочей копии — путь в src/stories;
 * для коммита — копия в tmp. Папка с story.ink или meta.json важнее .json, как в listStories.
 */
export function storyAt(rev, id, tmp) {
  if (isWorktree(rev.ref)) return listStories().find((p) => p.endsWith(`/${id}`) || p.endsWith(`/${id}.json`)) ?? null;
  const files = git(['ls-tree', '-r', '--name-only', rev.sha, '--', `${STORIES_DIR}/${id}`, `${STORIES_DIR}/${id}.json`], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const folder = files.filter((f) => f.startsWith(`${STORIES_DIR}/${id}/`));
  const isFolder = folder.some((f) => /\/(story\.ink|meta\.json)$/.test(f));
  const pick = isFolder ? folder : files.filter((f) => f === `${STORIES_DIR}/${id}.json`);
  if (!pick.length) return null;
  const base = join(tmp, rev.short);
  for (const f of pick) {
    const to = join(base, f);
    mkdirSync(dirname(to), { recursive: true });
    if (!existsSync(to)) writeFileSync(to, git(['show', `${rev.sha}:${f}`]));
  }
  return join(base, STORIES_DIR, isFolder ? id : `${id}.json`);
}
