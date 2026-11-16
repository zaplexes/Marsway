// AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function PersistentMap({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = slot.current?.getBoundingClientRect();
        if (bounds) setDocked(bounds.bottom < 220);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={slot} id="exploration-map" className="map-slot">
      <div className={`map-column${docked ? ' map-docked' : ''}`}>
        {docked && (
          <button
            className="map-return"
            onClick={() => {
              slot.current?.scrollIntoView({ block: 'start' });
              slot.current?.querySelector<HTMLCanvasElement>('canvas')?.focus({
                preventScroll: true,
              });
            }}
          >
            Your Mars companion · Full map ↗
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
