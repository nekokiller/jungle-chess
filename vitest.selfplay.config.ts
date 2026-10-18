// npm run ai:selfplay：只跑 AI 自我對弈（太慢，不放在一般測試裡）。
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.selfplay.ts'],
  },
});
