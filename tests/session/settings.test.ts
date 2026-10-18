import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, firstSide, isFlipped, parseSettings, type Settings } from '../../src/session/settings';

const ai = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, mode: 'ai', ...patch });

describe('開局設定', () => {
  it('和電腦下：玩家先走就輪到玩家那一方，否則輪到電腦', () => {
    expect(firstSide(ai({ humanSide: 'red', humanFirst: true }))).toBe('red');
    expect(firstSide(ai({ humanSide: 'red', humanFirst: false }))).toBe('blue');
    expect(firstSide(ai({ humanSide: 'blue', humanFirst: true }))).toBe('blue');
    expect(firstSide(ai({ humanSide: 'blue', humanFirst: false }))).toBe('red');
  });

  it('兩個人輪流：照選的那一方先走，不看電腦對局的設定', () => {
    expect(firstSide({ ...DEFAULT_SETTINGS, mode: 'pvp', pvpFirst: 'blue', humanFirst: false })).toBe('blue');
  });

  it('只有和電腦下、玩家執藍方時才把棋盤顛倒', () => {
    expect(isFlipped(ai({ humanSide: 'blue' }))).toBe(true);
    expect(isFlipped(ai({ humanSide: 'red' }))).toBe(false);
    expect(isFlipped({ ...DEFAULT_SETTINGS, mode: 'pvp', humanSide: 'blue' })).toBe(false);
  });

  it('預設是和電腦下入門、玩家執紅方先走', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ mode: 'ai', level: 'novice', humanSide: 'red', humanFirst: true });
  });

  it('讀回存過的設定', () => {
    const saved: Settings = { mode: 'pvp', level: 'hard', humanSide: 'blue', humanFirst: false, pvpFirst: 'blue' };
    expect(parseSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it('壞掉或不認得的欄位改用預設值', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"red"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ mode: 'online', level: 'god', humanSide: 'green', humanFirst: 'yes', level2: 1 }))).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(parseSettings(JSON.stringify({ level: 'master' }))).toEqual({ ...DEFAULT_SETTINGS, level: 'master' });
  });
});
