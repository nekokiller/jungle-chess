// 架構原則：規則引擎完全不碰畫面，只能 import engine/ 裡的其他檔案。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(import.meta.dirname, '../../src/engine');

describe('規則引擎的相依', () => {
  for (const file of readdirSync(dir).filter(f => f.endsWith('.ts'))) {
    it(`${file} 只 import engine/ 內的檔案`, () => {
      const src = readFileSync(join(dir, file), 'utf8');
      const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const spec of specs) expect(spec, `${file} import 了 ${spec}`).toMatch(/^\.\/[\w-]+$/);
    });
  }
});
