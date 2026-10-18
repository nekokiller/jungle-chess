// PWA 圖示：由 public/icon.svg 產生（npm run icons），輸出的 PNG 一併提交。
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // 圖示本身已經是滿版底色，maskable／蘋果圖示不必再縮小留白。
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#f5b82e' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#f5b82e' } },
  },
  images: ['public/icon.svg'],
});
