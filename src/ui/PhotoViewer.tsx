import { useEffect, useState } from 'react';
import { BackIcon, CloseIcon } from './Icons';

/**
 * Фото на весь экран, как в мессенджере: сверху кто прислал и когда, тап по картинке приближает,
 * тап по фону, крестик, «назад» и Escape закрывают.
 */
export function PhotoViewer({
  src,
  alt,
  sender,
  time,
  onClose,
}: {
  src: string;
  alt: string;
  sender: string;
  time: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="photo-viewer" role="dialog" aria-label={`Фото от ${sender}`} data-testid="photo-viewer" onClick={onClose}>
      <header className="photo-viewer__bar" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn--icon" onClick={onClose} aria-label="Назад к переписке">
          <BackIcon />
        </button>
        <span className="photo-viewer__title">
          <span className="photo-viewer__sender">{sender}</span>
          <span className="photo-viewer__time">{time}</span>
        </span>
        <button className="btn btn--icon" onClick={onClose} aria-label="Закрыть фото" data-testid="photo-viewer-close">
          <CloseIcon />
        </button>
      </header>
      <div className={zoomed ? 'photo-viewer__stage photo-viewer__stage--zoomed' : 'photo-viewer__stage'}>
        <img
          className={zoomed ? 'photo-viewer__img photo-viewer__img--zoomed' : 'photo-viewer__img'}
          src={src}
          alt={alt}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
        />
      </div>
    </div>
  );
}
