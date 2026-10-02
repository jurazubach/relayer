/** Что-то не открылось: сценарий не собрался или истории нет. */
export function ErrorScreen({
  title,
  details,
  onHome,
}: {
  title: string;
  details?: string[];
  onHome: () => void;
}) {
  return (
    <div className="error-box error-box--page">
      <h1 className="error-box__title">{title}</h1>
      {!!details?.length && (
        <ul className="error-box__list">
          {details.map((d) => (
            <li className="error-box__item" key={d}>
              {d}
            </li>
          ))}
        </ul>
      )}
      <button className="btn" onClick={onHome}>
        На главный
      </button>
    </div>
  );
}
