// Транскрипт прохождения бота в .md (C-52 п. 5): человек читает путь так, как его видит игрок.
import { fmtDur } from './text.mjs';

export function transcript(run, story, n) {
  const out = [`# ${story.meta?.title ?? story.id} — прохождение ${n}`, ''];
  let knot = null;
  for (const item of run.seq) {
    if (item.knot !== knot) { knot = item.knot; out.push('', `\`${knot}\``, ''); }
    if (item.type === 'choice') {
      item.texts.forEach((t, i) => out.push(`${i === item.picked ? '- [x]' : '- [ ]'} ${t}${item.silent[i] ? ' _(молчание)_' : ''}${item.tos[i] ? ` → ${item.tos[i]}` : ''}`));
      continue;
    }
    if (item.delay >= 1) out.push(`_— ${fmtDur(item.delay)} —_`);
    if (item.kind === 'sys') out.push(`> ${item.text}`);
    else if (item.kind === 'me') out.push(`**Вы:** ${item.text}`);
    else out.push(`**${item.who ?? '?'}:** ${item.text}${item.kind === 'photo' ? ' _(фото)_' : ''}`);
  }
  out.push('', run.ended ? '**Конец.**' : '_Прохождение не закончилось: предел строк lint.max_steps._', '');
  return out.join('\n');
}
