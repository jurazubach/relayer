import { useState } from 'react';

/**
 * Платная граница (E-05): бесплатная часть пройдена, история стоит на стыке глав.
 * Номера и названия главы нет (A-08): игрок не знает, сколько глав и сколько осталось.
 * Покупки пока нет — кнопка честно говорит, что это заглушка. Никакого давления:
 * прогресс на месте, история ждёт сколько угодно (build-plan.md §12).
 */
export function Paywall({
  inList = false,
}: {
  /** Над списком чатов, а не в поле ответа чата. */
  inList?: boolean;
}) {
  const [asked, setAsked] = useState(false);
  return (
    <section className={inList ? 'paywall paywall--list is-rising' : 'paywall is-rising'} data-testid="paywall">
      <span className="paywall__title">Бесплатная часть пройдена</span>
      <span className="paywall__text">
        Дальше — платное продолжение. Всё, что было, сохранено: история продолжится с этого места.
      </span>
      {asked ? (
        <span className="paywall__stub" role="status" data-testid="paywall-stub">
          Покупки пока нет: это прототип. Открыть продолжение можно в панели отладки.
        </span>
      ) : (
        <button className="btn btn--primary" onClick={() => setAsked(true)} data-testid="paywall-buy">
          Открыть продолжение
        </button>
      )}
    </section>
  );
}
