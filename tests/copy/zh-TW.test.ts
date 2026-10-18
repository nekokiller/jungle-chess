import { describe, expect, it } from 'vitest';
import { ANIMALS, type Piece, type PlayError } from '../../src/engine';
import { FULL, moveLine, reasonLine, resultLine, selectLine } from '../../src/copy/zh-TW';

const piece = (type: Piece['type'], side: Piece['side'] = 'red'): Piece => ({ type, side, id: `${side}-${type}` });
const REASONS: PlayError[] = [
  'noPiece', 'offBoard', 'ownPiece', 'notAdjacent', 'ownDen', 'waterOnlyRat', 'bankCapture',
  'jumpBlocked', 'rankTooLow', 'elephantVsRat', 'notYourTurn', 'gameOver',
];

describe('提示文字', () => {
  it('每一種不能走的原因都有說明（ownPiece 改成選取，不需要文字）', () => {
    for (const reason of REASONS) {
      const line = reasonLine(reason, { mover: piece('cat'), target: piece('lion', 'blue'), moverInWater: false, turn: 'red' });
      if (reason === 'ownPiece') expect(line).toBe('');
      else expect(line, reason).not.toBe('');
    }
  });

  it('等級不夠時說出兩隻動物的名字', () => {
    const line = reasonLine('rankTooLow', { mover: piece('cat'), target: piece('lion', 'blue'), moverInWater: false, turn: 'red' });
    expect(line).toBe('貓咪比獅子小，吃不掉牠！');
  });

  it('獅、虎想下水時提示可以跳河', () => {
    const line = reasonLine('waterOnlyRat', { mover: piece('tiger'), target: null, moverInWater: false, turn: 'red' });
    expect(line).toContain('跳過河');
  });

  it('每隻動物被選中時都有台詞', () => {
    const ctx = { trapped: false, inWater: false, besideRiver: false, jumpBlocked: false };
    for (const type of ANIMALS) expect(selectLine(type, ctx)).toContain(FULL[type]);
    expect(selectLine('dog', { ...ctx, trapped: true })).toContain('陷阱');
  });

  it('走完一步會說明並提示換誰', () => {
    expect(moveLine(piece('tiger'), piece('cat', 'blue'), [], '藍方')).toBe('老虎吃掉了貓咪！換藍方。');
    expect(moveLine(piece('tiger', 'blue'), piece('cat'), [], '你')).toBe('老虎吃掉了貓咪！換你了！');
  });

  it('四種結束方式都有說明', () => {
    expect(resultLine({ winner: 'red', reason: 'den' }, piece('rat'))).toBe('老鼠衝進藍方的獸穴，紅方獲勝！');
    expect(resultLine({ winner: 'blue', reason: 'allCaptured' }, piece('lion', 'blue'))).toContain('吃光');
    expect(resultLine({ winner: 'red', reason: 'noMoves' }, piece('rat'))).toContain('藍方沒有路可以走');
    expect(resultLine({ winner: null, reason: 'repetition' }, piece('rat'))).toContain('平手');
  });

  it('和電腦下時說「你贏了」「電腦贏了」', () => {
    expect(resultLine({ winner: 'red', reason: 'den' }, piece('rat'), 'red')).toBe('老鼠衝進藍方的獸穴，你贏了！好厲害！');
    expect(resultLine({ winner: 'blue', reason: 'den' }, piece('rat', 'blue'), 'red')).toContain('電腦贏了');
  });
});
