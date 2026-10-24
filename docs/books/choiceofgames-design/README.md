# Choice of Games: принципы дизайна выборов

- **Автор:** блог студии Choice of Games: Dan Fabulich (S3–S5, S17), Adam Strong-Morse (S8–S10, S12), Jason Stevan Hill (S13–S15), Rachel E. Towers (S6, S7); S11 — гостевая статья Ben Serviss. Студия пишет текстовые игры на своём языке ChoiceScript.
- **Тип:** статьи блога, 2010–2018. Единого года нет.
- **На что опирался (все ссылки открыты; авторство и ключевые утверждения перепроверены при ревью):**
  - [S1] [How to Write Intentional Choices](https://www.choiceofgames.com/2016/12/how-to-write-intentional-choices/), 2016
  - [S2] [Why Multiple-Choice Games?](https://www.choiceofgames.com/about-us/why-multiple-choice-games/)
  - [S3] [By the Numbers: How to Write a Long Interactive Novel That Doesn't Suck](https://www.choiceofgames.com/2011/07/by-the-numbers-how-to-write-a-long-interactive-novel-that-doesnt-suck/), 2011
  - [S4] [4 Common Mistakes in Interactive Novels](https://www.choiceofgames.com/2011/12/4-common-mistakes-in-interactive-novels/), 2011
  - [S5] [7 Rules for Designing Great Stats](https://www.choiceofgames.com/2011/07/7-rules-for-designing-great-stats/), 2011
  - [S6] [How We Judge a Good Game — Part 1](https://www.choiceofgames.com/2017/03/how-we-judge-a-good-game-part-1/), 2017
  - [S7] [How We Judge a Good Game — Part 2](https://choiceofgames.com/2017/03/how-we-judge-a-good-game-part-2), 2017, Rachel E. Towers
  - Второй проход: S18–S30 (руководство CoG для авторов, стайлгайд, статьи о длине и автотестах) — в `DEEPEN.md`
  - [S8] [End Game and Victory Design](https://www.choiceofgames.com/2016/11/end-game-and-victory-design/), 2016
  - [S9] [Don't Start at the Beginning!](https://www.choiceofgames.com/2010/05/dont-start-at-the-beginning/), 2010
  - [S10] [How We Plan a ChoiceScript Game](https://www.choiceofgames.com/2010/05/planning-a-choicescript-game/), 2010
  - [S11] [Writing Interactive Fiction in Six Steps](https://www.choiceofgames.com/2015/01/writing-interactive-fiction-in-six-steps/), 2015
  - [S12] [Four Ways to Write a Vignette](https://www.choiceofgames.com/2010/07/four-ways-to-write-a-vignette/), 2010
  - [S13] [A Taxonomy of Choices: Establishing Character](https://www.choiceofgames.com/2017/12/a-taxonomy-of-choices-establishing-character/), 2017
  - [S14] [A Taxonomy of Choices: Axes of Choice](https://www.choiceofgames.com/2017/12/a-taxonomy-of-choices-axes-of-choice/), 2017
  - [S15] [A Taxonomy of Choices: Axes of Success](https://www.choiceofgames.com/2018/01/a-taxonomy-of-choices-axes-of-success/), 2018
  - [S17] [5 Rules for Writing Interesting Choices in Multiple-Choice Games](https://www.choiceofgames.com/2010/03/5-rules-for-writing-interesting-choices-in-multiple-choice-games/), 2010 — добавлена при ревью
  - [S16] Взгляд со стороны: Emily Short, [Loose, Tight, Flat, and Bumpy Stats in ChoiceScript Games](https://emshort.blog/2017/05/09/loose-tight-flat-and-bumpy-stats-in-choicescript-games/), 2017

## О чём

Студия пишет длинные линейные по главам истории, в которых выбор всё равно важен: последствия откладываются в переменные и всплывают через главы. В статьях разобраны виды выборов (фальшивый, устанавливающий, проверочный, развилка, кульминационный), правила для переменных, устройство финалов и типовые ошибки. Плюс рубрика жюри их конкурса — по сути готовый чек-лист.

**Главная мысль:** выбор осмыслен, когда игрок понимает, чего хочет добиться и чем рискует, и когда последствие догоняет его позже, хотя ветки давно сошлись.

## Самое ценное для нас

1. Перед развилкой игрок должен знать ставки: что можно получить, что проверяется и что труднее (`P-01`, `RED-01`, `PAT-07`).
2. Сюжет может оставаться линейным, если выборы копятся в переменных, а каждая глава их и меняет, и проверяет. Карта «Чужого голоса» почти линейна, и это нормально, пока переменные читаются (`P-06`, `P-07`, `PAT-01`).
3. У финала несколько независимых целей, которые тянут игрока в разные стороны. Тогда концовка складывается из результатов по каждой цели, а не сводится к «выиграл / проиграл» (`P-11`, `PAT-03`, `RED-09`).
4. Фальшивый выбор допустим, если он строит характер и не выдаёт себя (а перепрохождение выдаёт его всегда). 126 кнопок, которые меняют только реплику, нужно проверить именно этим критерием (`P-14`, `PAT-10`, `RED-05`).
5. Не начинай писать с первой главы: у неё больше всего обязанностей. Сначала яркая сцена из ранней середины (`P-16`, чек-лист «Как начать»).
6. Каждой развилке — тип из таксономии Choice of Games, а в главе — смесь типов под разных игроков (`P-19`, `P-20`).

## Уверенность

- **Проверено по открытым статьям:** авторство S3–S5, S8–S15, S17; таксономия выборов (S13–S15); семь правил статов и примеры Loyalty и Cunning/Honor из Choice of the Dragon (S5); Four Point Trap (S15); stack of bushes и arm-and-fingers с расчётом «13 глав» (S8); финал не раньше ~75%, нет финалов «провалил всё», ≥3 вариантов, исключение для бездействия (S7); 100–200 слов, 400 — стена (S4); 8–12 сцен и 5–6 героев (S10); шесть проходов (S11); 10–15% у Emily Short (S16); четыре типа игроков (S17).
- **Вывод редактора, а не источника:** «наказание за любопытство» (`RED-02`): в статьях такого термина нет, правило выведено из S1 и S17 (правило 2). Перенос порогов слов на реальное время (`P-13`) — наш.
- **Второй проход:** руководство для авторов и стайлгайд CoG открыты (S18, S19) — правило трёх вариантов подтверждено. Уроки практиков — `lessons.md`, адаптация к мобильному игроку — `attention.md`, устройство систем — `patterns.md`, `SYS-01…05`.
- **Не удалось проверить:** открытых данных об удержании и дочитывании у CoG нет. Автор S7 сверен при втором проходе: Rachel E. Towers. Цифры по «Чужому голосу» получены нашими прогонами, а не из источника.
