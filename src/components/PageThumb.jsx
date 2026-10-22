import { useEffect, useRef, useState } from 'react';
import { renderPage } from '../lib/pdf.js';

/** Lazily renders one PDF page when it scrolls into view. */
export default function PageThumb({ fileId, page = 0, width = 160, rotate = 0, className = '' }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (fileId?.startsWith('img:')) {
      setReady(true);
      return;
    }
    let cancelled = false;
    renderPage(fileId, page, canvas.current, width)
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible, fileId, page, width]);

  const sideways = rotate % 180 !== 0;
  const isImage = fileId?.startsWith('img:');
  const imageUrl = isImage ? fileId.slice(4) : null;

  return (
    <div ref={wrap} className={`thumb ${className}`}>
      {!ready && <div className="skeleton" />}
      {isImage ? (
        <img
          src={imageUrl}
          alt={`Page ${page + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `rotate(${rotate}deg)${sideways ? ' scale(0.707)' : ''}`,
          }}
          onLoad={() => setReady(true)}
        />
      ) : (
        <canvas
          ref={canvas}
          style={{ transform: `rotate(${rotate}deg)${sideways ? ' scale(0.707)' : ''}` }}
        />
      )}
    </div>
  );
}
