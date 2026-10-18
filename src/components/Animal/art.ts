// 八隻動物的 Q 版 SVG（viewBox 0 0 100 100）。
// 畫法沿用 docs/architecture/prototype/animal-prototype.html：圓形底盤、頭部置中、右下角留給等級徽章。
// 這裡產生的是固定的向量字串（不含任何外部輸入），由 <Animal> 直接塞進 <svg>。
import type { AnimalType } from '../../engine';

const f1 = (n: number) => Math.round(n * 10) / 10;

interface FaceOpts {
  /** 兩眼的 x */
  ex: [number, number];
  /** 眼睛的 y */
  ey: number;
  /** 嘴巴的 y */
  my: number;
  /** 腮紅的 x */
  cx: [number, number];
  /** 腮紅的 y */
  cy: number;
  /** 沒有嘴巴（例如被象鼻擋住） */
  noMouth?: boolean;
}

/** 四種表情的眼睛和嘴巴都先畫好，由 data-face 切換顯示。 */
function face(o: FaceOpts): string {
  const [a, b] = o.ex;
  const y = o.ey;
  const m = o.my;
  const eye = (x: number) =>
    `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="3.5" ry="4.4" fill="#3a2a22"/><circle cx="${f1(x + 1.2)}" cy="${f1(y - 1.7)}" r="1.25" fill="#fff"/></g>`;
  const happy = (x: number) => `<path d="M${f1(x - 4.2)} ${f1(y + 1.4)}Q${x} ${f1(y - 4.4)} ${f1(x + 4.2)} ${f1(y + 1.4)}"/>`;
  const scared = (x: number) =>
    `<circle cx="${x}" cy="${y}" r="5.4" fill="#fff" stroke="#3a2a22" stroke-width="1.4"/><circle cx="${x}" cy="${f1(y + 0.6)}" r="1.8" fill="#3a2a22"/>`;
  const mouths = o.noMouth
    ? ''
    : `<g class="mouth mouth-normal"><path d="M45 ${m}Q47.5 ${f1(m + 3)} 50 ${m}Q52.5 ${f1(m + 3)} 55 ${m}"/></g>
      <g class="mouth mouth-happy"><path d="M44.5 ${f1(m - 1)}Q50 ${f1(m + 8)} 55.5 ${f1(m - 1)}Z"/></g>
      <g class="mouth mouth-scared"><ellipse cx="50" cy="${f1(m + 2)}" rx="2.4" ry="3"/></g>`;
  return `<g fill="#ff8f8f" opacity=".45"><ellipse cx="${o.cx[0]}" cy="${o.cy}" rx="4.6" ry="2.8"/><ellipse cx="${o.cx[1]}" cy="${o.cy}" rx="4.6" ry="2.8"/></g>
    <g class="eyes eyes-open">${eye(a)}${eye(b)}</g>
    <g class="eyes eyes-happy">${happy(a)}${happy(b)}</g>
    <g class="eyes eyes-scared">${scared(a)}${scared(b)}</g>
    <g class="eyes eyes-squeeze"><path d="M${f1(a - 3.8)} ${f1(y - 3.8)}L${f1(a + 3)} ${y}L${f1(a - 3.8)} ${f1(y + 3.8)}"/><path d="M${f1(b + 3.8)} ${f1(y - 3.8)}L${f1(b - 3)} ${y}L${f1(b + 3.8)} ${f1(y + 3.8)}"/></g>
    ${mouths}`;
}

const ART: Record<AnimalType, () => string> = {
  // 象：大耳朵搧動、甩鼻子
  elephant: () => `<g class="ear ear-l"><ellipse cx="25" cy="50" rx="15" ry="19" fill="#9fb0c7"/><ellipse cx="27" cy="51" rx="9.5" ry="13" fill="#f2c1cd"/></g>
    <g class="ear ear-r"><ellipse cx="75" cy="50" rx="15" ry="19" fill="#9fb0c7"/><ellipse cx="73" cy="51" rx="9.5" ry="13" fill="#f2c1cd"/></g>
    <ellipse cx="50" cy="50" rx="21.5" ry="20.5" fill="#b3c1d4"/>
    <path d="M44 33.5Q50 30.5 56 33.5" fill="none" stroke="#9fb0c7" stroke-width="2" stroke-linecap="round"/>
    ${face({ ex: [41, 59], ey: 46, my: 62, cx: [34.5, 65.5], cy: 54.5, noMouth: true })}
    <g class="trunk"><path d="M50 52C50 61 50.5 67 48.5 72C47 76 50 79.5 54 77.5" fill="none" stroke="#b3c1d4" stroke-width="9" stroke-linecap="round"/>
      <path d="M45.6 61.5h8.6M45.6 66h8.2" stroke="#97a8bf" stroke-width="1.3" stroke-linecap="round"/></g>`,

  // 獅：鬃毛蓬鬆擺動
  lion: () => {
    let outer = '';
    let inner = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const b = a + Math.PI / 12;
      outer += `<circle cx="${f1(50 + 27 * Math.cos(a))}" cy="${f1(52 + 27 * Math.sin(a))}" r="10.5"/>`;
      inner += `<circle cx="${f1(50 + 22 * Math.cos(b))}" cy="${f1(52 + 22 * Math.sin(b))}" r="8"/>`;
    }
    return `<g class="mane"><g fill="#d4832a"><circle cx="50" cy="52" r="28"/>${outer}</g><g fill="#e59a3a">${inner}</g></g>
      <g fill="#f6c453"><circle cx="33" cy="35" r="7"/><circle cx="67" cy="35" r="7"/></g>
      <g fill="#e8906a"><circle cx="33" cy="35" r="3.4"/><circle cx="67" cy="35" r="3.4"/></g>
      <circle cx="50" cy="54" r="20.5" fill="#f6c453"/>
      <ellipse cx="50" cy="63" rx="10" ry="7.2" fill="#fde9b8"/>
      ${face({ ex: [42.5, 57.5], ey: 50, my: 64.6, cy: 58.5, cx: [36.5, 63.5] })}
      <path d="M46.8 58.4h6.4l-3.2 3.3z" fill="#6b3b2a" stroke="#6b3b2a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M50 61.8v2.6" stroke="#6b3b2a" stroke-width="1.6" stroke-linecap="round"/>`;
  },

  // 虎：尾巴擺動
  tiger: () => `<g class="tail"><path d="M37 76C16 81 7 66 15 50" fill="none" stroke="#f39a3c" stroke-width="7" stroke-linecap="round"/>
      <path d="M37 76C16 81 7 66 15 50" fill="none" stroke="#4a2e1a" stroke-width="7" stroke-dasharray="2.6 6.4"/></g>
    <g fill="#f39a3c"><circle cx="31" cy="34" r="9"/><circle cx="69" cy="34" r="9"/></g>
    <g fill="#fde3c2"><circle cx="31" cy="34" r="4.6"/><circle cx="69" cy="34" r="4.6"/></g>
    <ellipse cx="50" cy="54" rx="24" ry="21.5" fill="#f6a548"/>
    <g stroke="#4a2e1a" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M50 33.5v6"/><path d="M43.5 35l1.8 4.8"/><path d="M56.5 35l-1.8 4.8"/>
      <path d="M26.5 49l7 1.6"/><path d="M26.5 55.5h7"/><path d="M73.5 49l-7 1.6"/><path d="M73.5 55.5h-7"/></g>
    <ellipse cx="45.6" cy="62" rx="5.6" ry="4.4" fill="#fff6ea"/><ellipse cx="54.4" cy="62" rx="5.6" ry="4.4" fill="#fff6ea"/>
    ${face({ ex: [41, 59], ey: 49.5, my: 64.4, cy: 57, cx: [35, 65] })}
    <path d="M47.3 57.6h5.4l-2.7 2.8z" fill="#6b3b2a" stroke="#6b3b2a" stroke-width="1.6" stroke-linejoin="round"/>`,

  // 豹：舔爪子
  leopard: () => `<g fill="#eebc52"><circle cx="32" cy="35" r="7.5"/><circle cx="68" cy="35" r="7.5"/></g>
    <g fill="#f6d9a8"><circle cx="32" cy="35" r="3.6"/><circle cx="68" cy="35" r="3.6"/></g>
    <ellipse cx="50" cy="54" rx="23" ry="21" fill="#f5c862"/>
    <g fill="#a9713a"><circle cx="40" cy="39" r="2.4"/><circle cx="50" cy="35.6" r="2"/><circle cx="60" cy="39" r="2.4"/>
      <circle cx="31.5" cy="48" r="2"/><circle cx="68.5" cy="48" r="2"/><circle cx="29.2" cy="55.5" r="1.6"/><circle cx="70.8" cy="55.5" r="1.6"/></g>
    <ellipse cx="45.8" cy="62.5" rx="5.2" ry="4" fill="#fff4dc"/><ellipse cx="54.2" cy="62.5" rx="5.2" ry="4" fill="#fff4dc"/>
    ${face({ ex: [41.5, 58.5], ey: 50, my: 64.6, cy: 57.5, cx: [35, 65] })}
    <path d="M47.3 58h5.4l-2.7 2.8z" fill="#6b3b2a" stroke="#6b3b2a" stroke-width="1.6" stroke-linejoin="round"/>
    <g class="paw"><ellipse cx="35" cy="79" rx="7.5" ry="6" fill="#f5c862" stroke="#e0a83f" stroke-width="1.2"/>
      <path d="M32.5 75.5v3M35 75v3.4M37.5 75.5v3" stroke="#d69a39" stroke-width="1.1" stroke-linecap="round"/></g>
    <ellipse class="tongue" cx="50" cy="68.2" rx="2.6" ry="3.2" fill="#f07f8e"/>`,

  // 狼：豎耳朵、仰頭
  wolf: () => `<g class="head">
    <g class="ear ear-l"><path d="M28 44L30 14L46 30Z" fill="#8d97a3" stroke="#8d97a3" stroke-width="4" stroke-linejoin="round"/><path d="M32 38L33 22L41 30Z" fill="#e7c6cf"/></g>
    <g class="ear ear-r"><path d="M72 44L70 14L54 30Z" fill="#8d97a3" stroke="#8d97a3" stroke-width="4" stroke-linejoin="round"/><path d="M68 38L67 22L59 30Z" fill="#e7c6cf"/></g>
    <g fill="#a3adb8"><path d="M30 49L21.5 57L28 59L23.5 66L33 64Z"/><path d="M70 49L78.5 57L72 59L76.5 66L67 64Z"/></g>
    <ellipse cx="50" cy="53" rx="23.5" ry="21" fill="#a3adb8"/>
    <path d="M50 37.5L46.5 44L50 47.5L53.5 44Z" fill="#c9d0d8"/>
    <ellipse cx="50" cy="63" rx="12" ry="9" fill="#e6e9ee"/>
    ${face({ ex: [41, 59], ey: 49, my: 66.4, cy: 57.5, cx: [34.5, 65.5] })}
    <ellipse cx="50" cy="59.6" rx="3.8" ry="2.7" fill="#2f2a2e"/><circle cx="51.2" cy="58.8" r=".9" fill="#fff" opacity=".7"/>
    <path d="M50 62.2v3.6" stroke="#5a3426" stroke-width="1.5" stroke-linecap="round"/></g>`,

  // 狗：搖尾巴、吐舌頭
  dog: () => `<g class="dtail"><path d="M64 74C76 74 82 68 84 59" fill="none" stroke="#c98b4e" stroke-width="6.5" stroke-linecap="round"/></g>
    <ellipse cx="50" cy="53" rx="22" ry="20.5" fill="#e0ad72"/>
    <ellipse cx="59" cy="47.5" rx="7.4" ry="7" fill="#c48448"/>
    <g class="ear ear-l"><ellipse cx="28" cy="49" rx="7.5" ry="14.5" transform="rotate(18 28 49)" fill="#9c6236"/></g>
    <g class="ear ear-r"><ellipse cx="72" cy="49" rx="7.5" ry="14.5" transform="rotate(-18 72 49)" fill="#9c6236"/></g>
    <ellipse cx="50" cy="62" rx="11.5" ry="8.6" fill="#fbe7cc"/>
    <path class="tongue" d="M46.8 65.6h6.4v4.4a3.2 3.2 0 0 1-6.4 0Z" fill="#f2788a"/>
    ${face({ ex: [41.5, 58.5], ey: 48.5, my: 64.4, cy: 56.5, cx: [37.5, 62.5] })}
    <ellipse cx="50" cy="58.4" rx="4" ry="3" fill="#3a2a22"/><circle cx="51.3" cy="57.5" r="1" fill="#fff" opacity=".7"/>`,

  // 貓：甩尾巴、耳朵抖動、鬍鬚
  cat: () => `<g class="tail"><path d="M63 76C84 81 93 66 85 50" fill="none" stroke="#e39a4f" stroke-width="7" stroke-linecap="round"/><path d="M87.6 56.5C87.6 53.5 86.8 51.5 85 50" fill="none" stroke="#b86d2c" stroke-width="7" stroke-linecap="round"/></g>
    <g class="ear ear-l"><path d="M29 43L31 19L47 31Z" fill="#f2b468" stroke="#f2b468" stroke-width="4" stroke-linejoin="round"/><path d="M32.6 37L33.6 25.5L41.5 31.8Z" fill="#f6a6ad"/></g>
    <g class="ear ear-r"><path d="M71 43L69 19L53 31Z" fill="#f2b468" stroke="#f2b468" stroke-width="4" stroke-linejoin="round"/><path d="M67.4 37L66.4 25.5L58.5 31.8Z" fill="#f6a6ad"/></g>
    <ellipse cx="50" cy="53" rx="24" ry="21" fill="#f5c27d"/>
    <g stroke="#d98a3d" stroke-width="2.6" stroke-linecap="round"><path d="M50 33.6v5.6"/><path d="M44 35l1.4 4.8"/><path d="M56 35l-1.4 4.8"/></g>
    <ellipse cx="45.6" cy="62" rx="5.4" ry="4.2" fill="#fff3e0"/><ellipse cx="54.4" cy="62" rx="5.4" ry="4.2" fill="#fff3e0"/>
    ${face({ ex: [41, 59], ey: 50, my: 64.2, cy: 57.5, cx: [34.5, 65.5] })}
    <path d="M47.7 57.4h4.6l-2.3 2.5z" fill="#ef8a9a" stroke="#ef8a9a" stroke-width="1.6" stroke-linejoin="round"/>
    <g class="whiskers wl" stroke="#8a6a50" stroke-width="1.3" stroke-linecap="round"><path d="M38 59.5L23 56.5"/><path d="M38 62.5L23 64"/></g>
    <g class="whiskers wr" stroke="#8a6a50" stroke-width="1.3" stroke-linecap="round"><path d="M62 59.5L77 56.5"/><path d="M62 62.5L77 64"/></g>`,

  // 鼠：鼻子嗅嗅、鬍鬚抖動、耳朵
  rat: () => `<g class="rtail"><path d="M62 74C80 86 91 74 85 64C81 57 86 52 91 53" fill="none" stroke="#eba3b6" stroke-width="3.2" stroke-linecap="round"/></g>
    <g class="ear ear-l"><circle cx="30" cy="34" r="13" fill="#b9b4cc"/><circle cx="30" cy="34" r="8" fill="#f4b7c6"/></g>
    <g class="ear ear-r"><circle cx="70" cy="34" r="13" fill="#b9b4cc"/><circle cx="70" cy="34" r="8" fill="#f4b7c6"/></g>
    <path d="M50 33C65 33 72 45 70.5 56.5C69 68.5 60 75 50 75C40 75 31 68.5 29.5 56.5C28 45 35 33 50 33Z" fill="#cfcadd"/>
    <ellipse cx="50" cy="65" rx="11" ry="8" fill="#e9e6f1"/>
    ${face({ ex: [42, 58], ey: 51, my: 67, cy: 59.5, cx: [36, 64] })}
    <rect x="47.4" y="68.6" width="5.2" height="4.6" rx="1.2" fill="#fff" stroke="#9b97ad" stroke-width="1"/><path d="M50 68.8v4.2" stroke="#9b97ad" stroke-width=".8"/>
    <g class="whiskers wl" stroke="#7f7a94" stroke-width="1.2" stroke-linecap="round"><path d="M41 63.5L27 59.5"/><path d="M41 66.5L27 67.5"/></g>
    <g class="whiskers wr" stroke="#7f7a94" stroke-width="1.2" stroke-linecap="round"><path d="M59 63.5L73 59.5"/><path d="M59 66.5L73 67.5"/></g>
    <circle class="nose" cx="50" cy="62" r="3.2" fill="#f08aa5"/>`,
};

const SWEAT = `<g class="sweat"><path d="M75 28C79.5 34.5 79.5 38.5 75 40C70.5 38.5 70.5 34.5 75 28Z" fill="#8fd0f5" stroke="#fff" stroke-width="1.2"/></g>`;

const cache = new Map<AnimalType, string>();

/** 底盤、外框、動物本體、汗珠；等級徽章由 <Animal> 另外畫（數字會變）。 */
export function animalArt(type: AnimalType): string {
  let html = cache.get(type);
  if (!html) {
    html = `<circle class="plate" cx="50" cy="50" r="45"/><circle class="ring" cx="50" cy="50" r="45"/>${ART[type]()}${SWEAT}`;
    cache.set(type, html);
  }
  return html;
}
