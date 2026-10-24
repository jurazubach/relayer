# title: 01:42 · Слепое пятно
# contact: argus, Аргус, red
# contact: lead, Кай, blue
# contact: devops, Рид, orange
# contact: sec, Меган, indigo
# contact: intern, Итан, cyan
# contact: manager, Рита, amber
# contact: partner, Кронбет, pink
# contact: ghost, Неизвестный номер, grey
# contact: fake, Рид (новый номер), orange
# contact: notes, Заметки, green

// первая волна
VAR matbug = false
VAR pods_seen = false
VAR snapshot = false
VAR games_pulled_early = false
// между волнами
VAR rotate_full = false
VAR rotate_pushed = 0
VAR shift_alert = false
VAR note_defense = false
VAR knows_prep = false
// вторая волна
VAR blamed_rid = false
VAR replace_nodes = false
VAR cloudtrail = false
VAR first_move = ""
VAR moves = 0
// сквозные
VAR trust_lead = 0
VAR trust_sec = 0
VAR leaked = 0
VAR phished = false
VAR checked_fake = false
VAR obeyed_manager = false
VAR skill = 0
VAR ending = ""

-> ch1

INCLUDE ch01.ink
INCLUDE ch02.ink
INCLUDE ch03.ink
INCLUDE ch04.ink
INCLUDE ch05.ink
