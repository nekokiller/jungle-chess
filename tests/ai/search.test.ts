import { describe, expect, it } from 'vitest';
import { createGame, legalMoves, play, toSquare, type GameState } from '../../src/engine';
import { LEVELS, levelOf } from '../../src/ai/levels';
import { WIN, evaluate, search } from '../../src/ai/search';
import { playAll, setup } from '../engine/helpers';

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (state: GameState, depth: number) => {
  const r = search(state, { depth, timeMs: 5000 });
  return `${toSquare(r.move.from)}-${toSquare(r.move.to)}`;
};

describe('AI 搜尋', () => {
  it('能直接進獸穴就進', () => {
    const state = createGame(setup({ d8: 'R', a9: 'l', g9: 't' }));
    expect(pick(state, 1)).toBe('d8-d9');
  });

  it('看得到兩步後進獸穴', () => {
    // 紅狼在 c8，走到 c9 或 d8 都能在下一步進穴；藍方只剩遠處的鼠擋不住。
    const state = createGame(setup({ c8: 'W', a1: 'r' }));
    const r = search(state, { depth: 3, timeMs: 5000 });
    expect(r.score).toBeGreaterThan(WIN - 100);
  });

  it('會擋住對方下一步進獸穴', () => {
    // 藍鼠在 d2 下一步就要進紅方獸穴 d1；紅狗在 c1 可以吃掉牠（鼠在紅方陷阱旁、陸地上）。
    const state = createGame(setup({ d2: 'r', c2: 'D', a9: 'l', g9: 't' }));
    expect(pick(state, 2)).toBe('c2-d2');
  });

  it('會吃掉送上門的棋子', () => {
    const state = createGame(setup({ d4: 'L', d5: 'p', a9: 'l', g1: 'T' }));
    expect(pick(state, 2)).toBe('d4-d5');
  });

  it('不會為了吃小子把大子送掉', () => {
    // 紅獅吃 d5 的藍鼠後，會被 d6 的藍象吃掉。
    const state = createGame(setup({ d4: 'L', d5: 'r', d6: 'e', g1: 'T', a9: 'l' }));
    expect(pick(state, 3)).not.toBe('d4-d5');
  });

  it('評估函式：雙方對稱的開局是 0 分', () => {
    const { board } = createGame();
    expect(evaluate(board, 'red')).toBe(0);
    expect(evaluate(board, 'blue')).toBe(0);
  });

  it('搜尋不會改到傳進來的盤面', () => {
    const state = createGame();
    const before = JSON.stringify(state);
    search(state, { depth: 3, timeMs: 5000 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('時間到就停在上一層的結果', () => {
    const start = performance.now();
    const r = search(createGame(), { depth: 30, timeMs: 150 });
    const elapsed = performance.now() - start;
    expect(r.depth).toBeGreaterThanOrEqual(1);
    expect(r.depth).toBeLessThan(30);
    expect(elapsed).toBeLessThan(600);
  });

  it('避免會造成第三次重複的走法（佔優勢時）', () => {
    // 紅方多一隻象。「紅獅 g2、藍獅 a9、輪到藍方」已經出現兩次（分別從 g1、f2 走過去），
    // 現在紅獅在 g1，再走 g1-g2 就是第三次。
    let state = createGame(setup({ g1: 'L', a3: 'E', a9: 'l' }));
    state = playAll(state, 'g1-g2', 'a9-a8', 'g2-f2', 'a8-a9', 'f2-g2', 'a9-a8', 'g2-g1', 'a8-a9');
    expect(state.result).toBeNull();
    const r = search(state, { depth: 3, timeMs: 5000 });
    expect(r.score).toBeGreaterThan(0);
    const next = play(state, r.move.from, r.move.to);
    expect(next.ok && next.state.result?.reason).not.toBe('repetition');
  });
});

describe('六檔難度', () => {
  it('每一檔在各種局面都只走合法的步', () => {
    const random = seeded(7);
    for (const level of LEVELS) {
      let state = createGame();
      for (let ply = 0; ply < 12 && !state.result; ply++) {
        const { move } = search(state, { ...level, timeMs: Math.min(level.timeMs, 60), random });
        const legal = legalMoves(state.board, state.turn).map(m => `${toSquare(m.from)}${toSquare(m.to)}`);
        expect(legal, level.name).toContain(`${toSquare(move.from)}${toSquare(move.to)}`);
        const r = play(state, move.from, move.to);
        if (!r.ok) throw new Error(r.reason);
        state = r.state;
      }
    }
  });

  it('入門會漏看吃子', () => {
    // 紅獅可以吃 d5 的藍豹；入門有三成機率沒看到。
    const state = createGame(setup({ d4: 'L', d5: 'p', a9: 'l', g1: 'T' }));
    const random = seeded(3);
    let missed = 0;
    for (let i = 0; i < 200; i++) {
      const { move } = search(state, { ...levelOf('novice'), random });
      if (!move.captured) missed++;
    }
    expect(missed).toBeGreaterThan(30);
    expect(missed).toBeLessThan(110);
  });

  it('開局時不管輪到紅方或藍方，每一檔都走得出合法的一步', () => {
    for (const turn of ['red', 'blue'] as const) {
      const state = createGame(undefined, turn);
      const legal = legalMoves(state.board, turn).map(m => `${toSquare(m.from)}-${toSquare(m.to)}`);
      for (const level of LEVELS) {
        const { move } = search(state, level);
        expect(legal, `${level.id} ${turn}`).toContain(`${toSquare(move.from)}-${toSquare(move.to)}`);
      }
    }
  });
});
