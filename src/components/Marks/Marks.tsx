import type { CSSProperties } from 'react';
import type { Move } from '../../engine';

const PAW = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="15.5" rx="5" ry="4.2" />
    <circle cx="6.3" cy="9.6" r="2.2" />
    <circle cx="9.9" cy="6.4" r="2.2" />
    <circle cx="14.1" cy="6.4" r="2.2" />
    <circle cx="17.7" cy="9.6" r="2.2" />
  </svg>
);

/** 合法落點：空格是腳印、可以吃的是紅圈、跳河外加旋轉虛線圈。 */
export function Marks({ moves }: { moves: readonly Move[] }) {
  return (
    <div className="layer marks">
      {moves.map(m => (
        <span
          key={`${m.to.row}-${m.to.col}`}
          className={`mark ${m.captured ? 'bite' : 'paw'}${m.kind === 'jump' ? ' jump' : ''}`}
          style={{ '--r': m.to.row, '--c': m.to.col } as CSSProperties}
        >
          {!m.captured && PAW}
        </span>
      ))}
    </div>
  );
}
