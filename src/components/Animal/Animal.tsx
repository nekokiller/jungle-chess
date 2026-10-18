import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RANK, type AnimalType, type Side } from '../../engine';
import { T, prefs } from '../../animation/timings';
import { animalArt } from './art';
import './animal.css';

export type Face = 'normal' | 'happy' | 'scared' | 'hurt';
export type AnimalState = 'idle' | 'selected' | 'scared' | 'celebrate';

interface Props {
  type: AnimalType;
  side: Side;
  state?: AnimalState;
  face?: Face;
  /** 徽章上的數字；掉進敵方陷阱時傳 0。預設為原本的等級。 */
  rank?: number;
}

/**
 * 一隻動物。由外到內分五層（架構文件 7.1）：
 * 位置由外層的棋子負責；hop 跳躍弧線、lift 被選中浮起、act 一次性動作、bob 持續循環。
 */
export const Animal = memo(function Animal({ type, side, state = 'idle', face = 'normal', rank = RANK[type] }: Props) {
  const [blink, setBlink] = useState(false);
  const delay = useMemo(() => `${(-Math.random() * 3).toFixed(2)}s`, []);

  // 每隻動物每 2～6 秒隨機眨一次眼。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (ms: number) => {
      timer = setTimeout(() => {
        if (prefs.reduced) return schedule(T.blinkMin);
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule(T.blinkMin + Math.random() * T.blinkRange);
        }, 140);
      }, ms);
    };
    schedule(800 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`animal ${type}${blink ? ' blink' : ''}${rank < RANK[type] ? ' trapped' : ''}`}
      data-side={side}
      data-state={state}
      data-face={face}
      style={{ '--d': delay } as CSSProperties}
    >
      <div className="hop">
        <div className="lift">
          <div className="act">
            <div className="bob">
              <svg viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: animalArt(type) }} />
              <svg className="badge" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="82" cy="82" r="12" />
                <text x="82" y="86.6" textAnchor="middle">{rank}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
