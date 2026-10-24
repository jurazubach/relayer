// Компиляция ink через inkjs: JSON для рантайма и ошибки, которые можно прочесть.
// inkjs отдаёт строки вида «ERROR: 'ch2.ink' line 14: …» и бросает «Compilation failed.» —
// здесь они превращаются в { file, line, message } с куском исходника вокруг строки.
import { Compiler, CompilerOptions, Story } from 'inkjs/full';

const MSG_RE = /^(ERROR|WARNING|RUNTIME ERROR|RUNTIME WARNING|TODO):\s*(?:'([^']+)'\s+)?(?:line\s+(\d+):\s*)?([\s\S]*)$/;

/** Строка inkjs → { severity, file, line, message }. */
export function parseMessage(raw, fallbackFile = null) {
  const m = String(raw).match(MSG_RE);
  if (!m) return { severity: 'error', file: fallbackFile, line: null, message: String(raw).trim() };
  const severity = m[1].includes('WARNING') ? 'warning' : m[1] === 'TODO' ? 'todo' : 'error';
  return { severity, file: m[2] ?? fallbackFile, line: m[3] ? Number(m[3]) : null, message: m[4].trim() };
}

/**
 * @param {string | {main: string, files: Record<string, string>}} input исходник или файлы истории (story.mjs)
 * @param {{countAllVisits?: boolean}} [opts] countAllVisits по умолчанию включён: инструменты считают посещения узлов
 * @returns {{ ok: boolean, json: string | null, errors: object[], warnings: object[], newStory: () => Story }}
 */
export function compile(input, opts = {}) {
  const { main, files } = typeof input === 'string' ? { main: 'story.ink', files: { 'story.ink': input } } : input;
  const fileHandler = {
    ResolveInkFilename: (name) => name,
    LoadInkFileContents: (name) => {
      if (name in files) return files[name];
      throw new Error(`нет файла «${name}» рядом с ${main}`);
    },
  };
  const raw = [];
  const options = new CompilerOptions(main, [], opts.countAllVisits ?? true, (msg) => raw.push(msg), fileHandler);
  const compiler = new Compiler(files[main], options);
  let json = null;
  try {
    json = compiler.Compile().ToJson();
  } catch (e) {
    if (!raw.length) raw.push(`ERROR: ${e.message}`);
  }
  // inkjs сообщает одну и ту же ошибку и парсером, и компилятором
  const msgs = [...new Set(raw)].map((r) => parseMessage(r, main));
  for (const m of msgs) m.excerpt = excerpt(files[m.file], m.line);
  const errors = msgs.filter((m) => m.severity === 'error');
  const warnings = msgs.filter((m) => m.severity !== 'error');
  const ok = json != null && !errors.length;
  return {
    ok,
    json: ok ? json : null,
    errors,
    warnings,
    newStory: () => {
      if (!ok) throw new Error('история не скомпилировалась: ' + formatMessages(errors));
      return new Story(json);
    },
  };
}

/** Строка с ошибкой и по одной соседней — чтобы было видно, о чём речь. */
function excerpt(text, line) {
  if (text == null || !line) return null;
  const lines = text.split('\n');
  const from = Math.max(1, line - 1);
  const to = Math.min(lines.length, line + 1);
  const out = [];
  for (let n = from; n <= to; n++) out.push(`${n === line ? '>' : ' '} ${String(n).padStart(5)} | ${lines[n - 1]}`);
  return out.join('\n');
}

/** Ошибки и предупреждения для консоли: «файл:строка: сообщение» и кусок исходника. */
export function formatMessages(list, indent = '   ') {
  return list
    .map((m) => {
      const where = [m.file, m.line].filter((x) => x != null).join(':');
      const head = `${indent}${m.severity === 'error' ? 'ошибка' : m.severity === 'warning' ? 'предупреждение' : 'TODO'}${where ? ` ${where}` : ''}: ${m.message}`;
      return m.excerpt ? `${head}\n${m.excerpt.replace(/^/gm, indent + '  ')}` : head;
    })
    .join('\n');
}

export { Story };
