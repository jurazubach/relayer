// логлайн: Ты — незнакомец из интернета, который за £12 в час пишет свидетелям чужим голосом, чтобы до слушания в пятницу доказать, что смерть Лили не случайность, — пока город не узнал, кто ты.
// вопрос: Что случилось с Лили на карьере — и с Денни два года назад — и кто считает до трёх на записи?
// ставка: Слушание у коронера в пятницу в десять утра, послезавтра: смерть Лили закроют как несчастный случай; игрок пишет свидетелям под чужой легендой, и город перестанет с ним говорить, как только узнает, кто он.
// оси: ellie_trust (верит ли Элли игроку и верит ли игрок ей), jess_bond (признается ли Джесс сама), proof (что доказано у двери Джудит)
# title: Векскомб · Чужой голос
# contact: ellie, Элли, amber
# contact: jess, Джесс, pink
# contact: connor, Коннор, orange
# contact: tom, Том, cyan
# contact: beth, Бет, purple
# contact: owen, Оуэн Брайт, blue
# contact: judith, Джудит Марш, teal
# contact: unknown, Неизвестный номер, grey
# contact: maya, Новый номер, red
# contact: bank, Банк, lime
# contact: notes, Заметки, green
# contact: lily, +44 7700 900521, pink
# contact: hart, Сержант Харт, blue

VAR alias = "Сэм"
VAR cover = "student"
VAR ellie_trust = 0
VAR judith_trust = 0
VAR jess_push = 0
VAR jess_suspicious = false
VAR jess_rumor = false
VAR beth_written = false
VAR connor_told = false
VAR connor_blocked = false
VAR connor_ally = false
VAR connor_to_owen = false
VAR connor_jacket = false
VAR owen_knows = 0
VAR owen_weakened = false
VAR confronted_night = false
VAR unknown_blocked = false
VAR told_judith_ellie = false
VAR note_connor = false
VAR note_beth = false
VAR note_threat = false
VAR quit_job = false
VAR exposed_fake = false
VAR called_bluff = false
VAR ellie_reaction = ""
VAR found_jacket_self = false
VAR cut_frames = false
VAR judith_revealed = false
VAR ending = ""
VAR act1 = ""

// ---- сезон ----
VAR world = ""
VAR maya_trust = 0
VAR maya_files = 0
VAR maya_target = ""
VAR whisper_known = false
VAR note_she = false
VAR jess_warned = false
VAR jess_bond = 0
VAR jess_clues = 0
VAR ellie_water = false
VAR ellie_warned = false
VAR ellie_alibi = false
VAR owen_reply = ""
VAR judith_guarded = false
VAR note_minute = false
VAR tom_hold = false
VAR maya_posted = false
VAR jess_exposed = false
VAR ellie_block_told = false
VAR note_shown_to = ""
VAR fake_note_caught = false
VAR bill_asked = false
VAR hart_fooled = false
VAR hart_exposed = false
VAR owen_turned = false
VAR owen_deal = false
VAR jess_confessed = 0
VAR jess_promised = false
VAR maya_stopped = false
VAR judith_waits = true
VAR ellie_testifies = false
VAR final_choice = ""
VAR proof = 0

// ---- улики к узлам раскрытия (// reveal:, C-54) ----
VAR clue_whisper = false
VAR clue_watch = false
VAR clue_ladder = false
VAR clue_bill = false
VAR clue_owen_saw = false

// ---- переработка X-E7 (план v1) ----
VAR note_jess = false
VAR note_lie = false
VAR note_rumor = false
VAR clue_count = false
VAR maya_sent = false
VAR note_ladder = false
VAR jess_alarmed = false
VAR maya_post = 0
VAR maya_go = false
VAR maya_at_door = false
VAR judith_promised = false
VAR c2_told_night = false
VAR c2_asked_accident = false
VAR c2_answered_unknown = false
VAR c3_wait = 0
VAR c3_owen_doubt = false
VAR c3_owen_tip = false
VAR c3_note_cc = false
VAR ch4_waited = false
VAR c5_waited = false
VAR c9_waited = false
VAR c9_waited_long = false
VAR c10_asked_phone = false
VAR c10_pressed = false

// ---- служебные флаги глав ----
VAR c7_ellie_out = false
VAR c7_post_ellie = false
VAR c8_ellie_late = false
VAR c8_beth_done = false
VAR c10_dawn = false

-> ch1

INCLUDE common.ink
INCLUDE ch01.ink
INCLUDE ch02.ink
INCLUDE ch03.ink
INCLUDE ch04.ink
INCLUDE ch05.ink
INCLUDE ch06.ink
INCLUDE ch07.ink
INCLUDE ch08.ink
INCLUDE ch09.ink
INCLUDE ch10.ink
