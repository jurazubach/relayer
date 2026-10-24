// Свод базы знаний: четыре агента параллельно собирают части docs/playbook/, затем один ревьюер проверяет всё вместе.
// Запуск: node docs/books/_pipeline/synthesize.mjs [--review-only]
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const OUT = join(ROOT, 'docs', 'playbook');
const MODEL = 'claude-opus-5-5';

const PARTS = [
  {
    file: 'rules.md',
    title: 'правила для генератора историй',
    read: 'Во всех `docs/books/*/for-relayer.md` — раздел с правилами для генератора. Во всех `docs/books/*/attention.md` — минимальные версии и разделы о первых минутах и возвращении после паузы. `docs/PROMPT.md` — чтобы знать, что генератор уже умеет.',
    task: `Собери \`docs/playbook/rules.md\` — свод правил, которые пойдут в промпт генератора историй.

Разделы:
1. Ядро и логлайн.
2. Первые 30 секунд и первые 3 минуты.
3. Структура глав и ветвление.
4. Выборы и кнопки.
5. Темп, паузы и возвращение после паузы.
6. Персонажи и голос.
7. Тайна и улики.
8. Финалы.
9. Чего не делать.

Формат пункта: \`R-NN. Правило повелительным наклонением.\`, затем строка \`Почему:\` с одним механизмом и строка \`Источники:\` со ссылками \`алиас:P-NN\`.

Правила внутри раздела расставь по важности. Вверху файла — «Короткая версия»: 15–20 самых важных правил одной строкой каждое, готовых для вставки в промпт как есть. Всего обычно 60–120 правил.`,
  },
  {
    file: 'checks.md',
    title: 'автоматические проверки сценария',
    read: 'Во всех `docs/books/*/for-relayer.md` — раздел с автоматическими проверками. Во всех `docs/books/*/flags.md` — колонку «как обнаружить». Во всех `docs/books/*/attention.md` — пороги нагрузки. А также `scripts/check-story.mjs` и `scripts/story-graph.mjs`, чтобы знать, какие данные уже есть.',
    task: `Собери \`docs/playbook/checks.md\` — спецификацию проверок для \`scripts/check-story.mjs\` и карты сюжета.

Формат каждой проверки:
- \`C-NN\` и название;
- что ловит (ссылки на \`RED-NN\` разборов);
- данные: теги, переменные, узлы, \`#delay\`, длина реплик, выборы, прохождения бота;
- как считать: формула или алгоритм на уровне ink-исходника или прохождений бота;
- порог и откуда он взялся (источник или «наша оценка»);
- текст предупреждения;
- уровень: ошибка / предупреждение / подсказка;
- сложность реализации: S / M / L.

Одинаковые проверки из разных источников слей, пороги согласуй. Вверху файла — таблица «первая волна»: 10–15 проверок с лучшим отношением пользы к сложности.

В конце файла прогони первую волну по трём историям (\`src/stories/*.json\`) вручную или скриптом во временной папке. Для каждой проверки покажи, что она находит сейчас. Скрипты в репозиторий не добавляй.`,
  },
  {
    file: 'story-findings.md',
    title: 'находки по нашим историям',
    read: 'Во всех `docs/books/*/for-relayer.md` — раздел «Разбор наших историй». Во всех `docs/books/*/README.md` и `REVIEW*.md` — упоминания наших узлов. Сами истории — `src/stories/*.json` (поле `ink`, описание, главы).',
    task: `Собери \`docs/playbook/story-findings.md\` — проблемы и сильные стороны трёх наших историй: \`the-number\`, \`slepoe-pyatno\`, \`chuzhoy-golos\`.

Для каждой находки:
- история и узлы ink;
- что не так или что работает;
- почему это важно для игрока;
- как починить, конкретно;
- какие источники на это указывают;
- приоритет P1 / P2 / P3.

**Каждую находку проверь по исходнику ink.** Если находка не подтверждается, не включай её и запиши в конце, в разделе «Не подтвердилось». Одинаковые находки из разных источников слей. Вверху файла — топ-10 правок по пользе для игрока.`,
  },
  {
    file: 'skills.md',
    title: 'план скиллов и команд',
    read: 'Во всех `docs/books/*/for-relayer.md` — раздел с идеями скиллов и команд. Во всех `docs/books/*/checklists.md` — процедуры. Также `CLAUDE.md` и `package.json` — существующие команды.',
    task: `Собери \`docs/playbook/skills.md\` — план скиллов Claude Code и команд проекта.

Для каждого скилла или команды:
- имя;
- когда вызывать: формулировки пользователя, по которым он срабатывает;
- вход и выход;
- пошаговый алгоритм;
- из каких файлов \`docs/books\` и \`docs/playbook\` он берёт знания;
- критерий готовности.

Обязательно разбери:
- придумать завязку и ядро истории;
- написать главу;
- ревью сценария;
- найти скучные и перегруженные места;
- проверить загадку и улики;
- адаптировать историю под короткое внимание.

Одинаковые идеи из разных источников слей. Вверху файла — порядок реализации и зависимости между скиллами.`,
  },
];

const REVIEW = {
  file: 'REVIEW.md',
  title: 'ревью свода',
  prompt: `Ты — строгий редактор. В \`docs/playbook/\` четыре части свода базы знаний: \`rules.md\`, \`checks.md\`, \`story-findings.md\`, \`skills.md\`. Они собраны из \`docs/books/*\`. Требования к ним — \`docs/books/_pipeline/synthesize.md\` и \`docs/books/_pipeline/synthesize.mjs\` (массив PARTS).

Проверь и исправь прямо в файлах:
1. Ссылки \`алиас:P-NN\` и \`RED-NN\` указывают на существующие пункты, и смысл совпадает. Проверь выборочно, но не меньше 30 ссылок.
2. Части не противоречат друг другу. Правило из \`rules.md\` и проверка из \`checks.md\` об одном и том же должны иметь одинаковый порог.
3. В \`story-findings.md\` каждая находка из топ-10 подтверждается исходником ink.
4. Нет воды, дублей и цитат.
5. В \`skills.md\` у каждого скилла есть входы и выходы и он ссылается на существующие файлы.

Создай \`docs/playbook/README.md\`: что это за папка, как она связана с \`docs/books\`, как пользоваться каждой частью, что делать дальше. До 60 строк.

Создай \`docs/playbook/REVIEW.md\`: вердикт, что исправлено, что осталось спорным.

Ничего не коммить. В конце выведи 3 строки.`,
};

function run(name, prompt) {
  return new Promise((resolve) => {
    mkdirSync(join(HERE, 'logs'), { recursive: true });
    const log = createWriteStream(join(HERE, 'logs', `playbook.${name}.log`), { flags: 'a' });
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const started = Date.now();
    const child = spawn('claude', ['-p', '--dangerously-skip-permissions', '--model', MODEL, '--output-format', 'stream-json', '--verbose'], { cwd: ROOT, env });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.stdin.end(prompt);
    const timer = setTimeout(() => child.kill('SIGTERM'), 100 * 60 * 1000);
    console.log(`▶ playbook ${name}`);
    child.on('close', (code) => {
      clearTimeout(timer);
      const ok = code === 0 && existsSync(join(OUT, name));
      console.log(`${ok ? '✓' : '✗'} playbook ${name} · ${((Date.now() - started) / 60000).toFixed(1)} мин${ok ? '' : ' · код ' + code}`);
      resolve(ok);
    });
  });
}

mkdirSync(OUT, { recursive: true });
const template = readFileSync(join(HERE, 'synthesize.md'), 'utf8');
if (!process.argv.includes('--review-only')) {
  const todo = PARTS.filter((p) => !existsSync(join(OUT, p.file)));
  const results = await Promise.all(todo.map((p) => run(p.file, template
    .replace(/\{\{part_title\}\}/g, p.title)
    .replace(/\{\{part_file\}\}/g, p.file)
    .replace('{{part_read}}', p.read)
    .replace('{{part_task}}', p.task))));
  // повтор упавших один раз
  const failed = todo.filter((_, i) => !results[i]);
  await Promise.all(failed.map((p) => run(p.file, template
    .replace(/\{\{part_title\}\}/g, p.title)
    .replace(/\{\{part_file\}\}/g, p.file)
    .replace('{{part_read}}', p.read)
    .replace('{{part_task}}', p.task))));
}
if (PARTS.every((p) => existsSync(join(OUT, p.file)))) await run(REVIEW.file, REVIEW.prompt);
else console.log('✗ не все части собраны, ревью свода пропущено');
