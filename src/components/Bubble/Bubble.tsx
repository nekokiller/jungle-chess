import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { prefs } from '../../animation/timings';
import { useGame } from '../../session/store';

/** 棋盤上方的對話框：選到的動物說的話、走錯的原因、輪到誰。 */
export function Bubble() {
  const message = useGame(s => s.message);
  const messageKey = useGame(s => s.messageKey);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current && !prefs.reduced && messageKey > 0) {
      animate(ref.current, { transform: ['scale(.97)', 'scale(1)'] }, { duration: 0.18, ease: 'easeOut' });
    }
  }, [messageKey]);

  return (
    <p className="bubble" ref={ref} aria-live="polite">
      {message}
    </p>
  );
}
