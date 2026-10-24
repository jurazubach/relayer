# Осмысленный выбор в играх — паспорт

- **Источник:** подборка. Brice Morrison, *Meaningful Choice in Games: Practical Guide & Case Studies* (Game Developer, 19.11.2013); Sid Meier, доклад *Interesting Decisions* (GDC 2012); Jesse Schell, *The Art of Game Design: A Book of Lenses* (линзы про выбор). Дополнительно: Caleb Compton (2019), Salen & Zimmerman *Rules of Play* (2004), A. A. Sarian (Eludamos, 2018).
- **Тип:** статьи, доклад, книга (по вторичным материалам).
- **Открытые ссылки, на которые опирался:**
  - https://gamedeveloper.com/design/meaningful-choice-in-games-practical-guide-case-studies — Morrison, четыре компонента
  - https://www.gamedeveloper.com/design/designing-interesting-decisions-in-games-and-when-not-to- — Compton: последствия, предсказуемость, неочевидность, когда выбор не нужен
  - https://www.filamentgames.com/blog/sid-meiers-narrative-design-part-one — четыре качества интересного выбора по Мейеру
  - https://www.gamedeveloper.com/business/gdc-vault-adds-free-gdc-2012-videos-featuring-meier-metrics-and-more — анонс бесплатной записи доклада Мейера (GDC Vault, апрель 2012)
  - https://en.wikipedia.org/wiki/Meaningful_play — discernable / integrated по Salen & Zimmerman
  - https://septentrio.uit.no/index.php/eludamos/article/view/vol9no1-2 — Sarian: выбор Telltale как мысленный эксперимент
  - https://www.denofgeek.com/games/the-walking-dead-false-promises-telltale/ — Matthew Byrd (2018): граф The Walking Dead почти линеен, а напоминания «запомнит это» обещали больше, чем давали

## О чём

Morrison раскладывает ощущение выбора на четыре компонента: awareness (осознанность), consequences (последствия, которые меняют игру, а не только картинку), reminders (напоминания), permanence (необратимость). Мейер описывает игру как цепочку решений, и интересное решение у него держится на четырёх качествах: tradeoffs (компромисс), situational (зависит от ситуации), personal (отражает игрока), persistent (последствие остаётся). Compton и Sarian добавляют две границы: когда выбор лучше вообще не давать и когда выбор без последствий всё равно работает, потому что смысл в самой дилемме.

## Главная мысль

Выбор ощущается, когда игрок видит развилку, понимает цену, потом встречает след своего решения и не может его отменить. Ветвление графа для этого нужно реже, чем кажется.

Мейер сказал это на GDC 1989 и вернулся к формулировке в докладе 2012 года: игра — это «a series of interesting decisions».

## Самое ценное для нас

1. Из 338 кнопок «Чужого голоса» дорогой ветки требуют немногие. Остальным хватит дешёвого следа: переменной плюс одной реплики через главу (`P-09`, `PAT-01`, `RED-03`).
2. Переменная, которую записали и ни разу не прочли, — это декорация, и её ловит автоматика (`called_bluff` в `ch4_bluff`, `RED-02`).
3. Перед финалом, который выбирает скрытая проверка, игроку нужна сводка того, что у него есть, иначе финал выглядит случайным (`P-02`, `PAT-07`).
4. «Промолчать» и «отказаться» — тоже выборы. Если сюжет тут же возвращает игрока на ту же реплику, игрок замечает обман (`P-11`, `RED-06`).
5. Косметический выбор оправдан, когда игрок выражает себя или задаёт ритм, и вредит, когда у кнопок одинаковый ответ (`P-06`, `P-12`, `RED-01`).

## Уверенность

- **Проверено по открытым текстам (ревью 2026-10-24):** четыре компонента Morrison (awareness, gameplay consequences, reminders, permanence) и его разборы; три свойства Compton (consequences, predictability, non-obviousness) и случаи, когда выбор лишний; дата фразы Мейера (1989); названия четырёх качеств Мейера (из определений найдено только tradeoffs); discernable / integrated; тезис Sarian; линейность TWD по Den of Geek.
- **Знание модели:** у Мейера situational, personal и persistent истолкованы мной (уверенность средняя). Термин dominant strategy (доминирующая стратегия) и линзы Schell про осмысленный выбор и triangularity — по памяти (уверенность средняя). Есть ли в книге Schell отдельные линзы про осмысленный выбор и про triangularity (риск против награды), по открытым страницам не подтвердилось. Номера линз не привожу.
- **Не проверено:** запись доклада Мейера целиком (видео на GDC Vault я не смотрел), текст книги Schell.
- **Цифры по «Чужому голосу»** посчитаны разбором `parseInk` из `scripts/story-graph.mjs`: 338 кнопок, 126 групп, 55 кнопок без тела, 8 одиночных безусловных групп, 60 `#silent`.
- **Наше, не из источника:** все пороги и метрики, разбор нашего ink, всё про `#silent`, `#to` и паузы.

## Второй проход (2026-10-24)

- `lessons.md` — 12 уроков практиков (Telltale, BioWare, Meier GDC 2010, Oxenfree, Life is Strange 2, Detroit, Bury Me My Love, Choices).
- `attention.md` — выбор на телефоне: минимальные версии P-01…P-15, первые 30 с / 3 мин / глава, возвращение после паузы, пороги нагрузки, тёмные паттерны.
- `principles.md` — устройство систем Morrison, Мейера, Compton, Salen & Zimmerman (SYS-1…SYS-4) и нюансы к каждому P.
- `patterns.md` — PAT-10 «эпилог со следами» и нюансы к PAT-01…PAT-10.
- `for-relayer.md` — раздел 6 «Согласия и противоречия»; проверки 14–18 и шесть правил генератора влиты в разделы 1–2.
- **Уверенность:** уроки — по открытым статьям и интервью, цифры только оттуда (92 % Paragon — оговорённое «примерно» разработчика). Определения situational/personal/persistent у Мейера и линзы Schell по-прежнему не проверены.
