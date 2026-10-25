/**
 * Предупреждение: сценарий обновился, и сохранение от прошлой ревизии к нему не подходит.
 * До игры (экран истории) — что игра начнётся сначала; в игре — что она уже началась сначала.
 */
export function RevisionNotice({
  from,
  to,
  done,
  onClose,
}: {
  from: number;
  to: number;
  /** Сохранение уже сброшено: игра идёт с начала. */
  done: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={onClose ? 'revision-notice revision-notice--top' : 'revision-notice'} role="status" data-testid="revision-notice">
      <span className="revision-notice__body">
        <span className="revision-notice__title">История обновилась</span>
        <span className="revision-notice__text">
          {done
            ? 'Сохранение было от прошлой версии и к новой не подходит, поэтому история началась сначала.'
            : 'Сохранение от прошлой версии к новой не подходит: игра начнётся сначала.'}
        </span>
        <span className="revision-notice__rev">
          ревизия {from} → {to}
        </span>
      </span>
      {onClose && (
        <button className="btn btn--ghost" onClick={onClose} data-testid="revision-notice-ok">
          Понятно
        </button>
      )}
    </div>
  );
}
