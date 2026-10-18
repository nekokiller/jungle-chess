// 粒子特效：星星、水花、塵土、彩帶、跳出的文字。直接加在特效圖層上，播完自己移除。
import { animate } from 'motion';
import { prefs } from '../../animation/timings';
import { stage } from '../../animation/registry';
import './effects.css';

export type Particle = 'star' | 'drop' | 'dust';

export function burst(x: number, y: number, kind: Particle, n: number, spread: number) {
  const layer = stage.fx;
  if (prefs.reduced || !layer) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = `p ${kind}`;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    layer.appendChild(s);
    // 水花往上噴再落下，其他往四面八方散開。
    const ang = kind === 'drop' ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2;
    const dist = spread * (0.55 + Math.random() * 0.7);
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    const fall = kind === 'drop' ? spread * 0.8 : 0;
    const rot = (Math.random() - 0.5) * 540;
    animate(
      s,
      {
        transform: [
          'translate(0px,0px) scale(.4)',
          `translate(${dx}px,${dy}px) scale(1) rotate(${rot / 2}deg)`,
          `translate(${dx * 1.15}px,${dy * 1.15 + fall}px) scale(.5) rotate(${rot}deg)`,
        ],
        opacity: [1, 1, 0],
      },
      { duration: (560 + Math.random() * 320) / 1000, times: [0, 0.55, 1], ease: [0.2, 0.7, 0.3, 1] },
    ).then(() => s.remove());
  }
}

export function popText(x: number, y: number, text: string) {
  const layer = stage.fx;
  if (prefs.reduced || !layer) return;
  const s = document.createElement('span');
  s.className = 'pop';
  s.textContent = text;
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  layer.appendChild(s);
  animate(
    s,
    {
      transform: ['translate(-50%,-50%) scale(.5)', 'translate(-50%,-90%) scale(1.15)', 'translate(-50%,-160%) scale(1)'],
      opacity: [0, 1, 0],
    },
    { duration: 0.9, times: [0, 0.3, 1], ease: 'easeOut' },
  ).then(() => s.remove());
}

const CONFETTI = ['#f5b82e', '#e4574a', '#3b7be0', '#7cc96a', '#f39ac0'];

export function confetti(n: number) {
  const layer = stage.fx;
  if (prefs.reduced || !layer) return;
  const w = layer.clientWidth;
  const h = layer.clientHeight;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'p confetti';
    s.style.background = CONFETTI[i % CONFETTI.length]!;
    s.style.left = `${Math.random() * w}px`;
    s.style.top = '-10px';
    layer.appendChild(s);
    const drift = (Math.random() - 0.5) * 80;
    animate(
      s,
      {
        transform: ['translate(0px,0px) rotate(0deg)', `translate(${drift}px,${h + 30}px) rotate(${(Math.random() - 0.5) * 900}deg)`],
        opacity: [1, 0.9],
      },
      { duration: (1300 + Math.random() * 900) / 1000, delay: Math.random() * 0.35, ease: [0.3, 0.1, 0.6, 1] },
    ).then(() => s.remove());
  }
}
