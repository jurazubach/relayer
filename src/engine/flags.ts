/**
 * Параметры в адресе — для тестов, скриншотов и быстрой проверки руками:
 *   ?story=the-number     сразу открыть историю (по умолчанию — играть)
 *   ?screen=home|story|game   какой экран показать
 *   ?fresh=1              стереть прогресс перед запуском
 *   ?fast=1               без пауз сюжета и набор текста ×4
 */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

export const FLAGS = {
  story: params.get('story'),
  screen: params.get('screen'),
  fresh: params.has('fresh'),
  fast: params.has('fast'),
};

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* без хранилища просто не запомним */
  }
}
