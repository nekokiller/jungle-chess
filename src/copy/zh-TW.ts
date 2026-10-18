// 所有提示文字（兒童語氣）。這裡只放文字，不碰盤面邏輯：需要的狀況由呼叫端算好傳進來。
import type { AnimalType, GameEvent, GameResult, Piece, PlayError, Side } from '../engine';

export const SHORT: Record<AnimalType, string> = {
  elephant: '象', lion: '獅', tiger: '虎', leopard: '豹', wolf: '狼', dog: '狗', cat: '貓', rat: '鼠',
};

export const FULL: Record<AnimalType, string> = {
  elephant: '大象', lion: '獅子', tiger: '老虎', leopard: '花豹', wolf: '野狼', dog: '小狗', cat: '貓咪', rat: '老鼠',
};

export const SIDE: Record<Side, string> = { red: '紅方', blue: '藍方' };

export const TERRAIN = { grass: '草地', water: '河流', trap: '陷阱', den: '獸穴' } as const;

export const ui = {
  title: '動物棋',
  turnLabel: '輪到',
  newGame: '新的一局',
  undo: '悔棋',
  setupTitle: '要怎麼玩？',
  opponent: '對手',
  vsAi: '電腦',
  vsHuman: '兩個人輪流',
  level: '難度',
  yourSide: '你要當',
  whoFirst: '誰先走',
  youFirst: '你先',
  aiFirst: '電腦先',
  start: '開始！',
  backToBoard: '回到棋盤',
  you: '你',
  computer: '電腦',
  playAgain: '再玩一次',
  changeSetup: '換設定',
  reduceMotion: '減少動態效果',
  sound: '聲音',
  soundOn: '聲音：開',
  soundOff: '聲音：關',
  volume: '音效',
  music: '音樂',
  musicVolume: '音樂音量',
  animalCalls: '動物叫聲',
  draw: '平手',
  legendWater: '河流（只有老鼠能下水）',
  legendTrap: '陷阱（掉進對方的陷阱會變最弱）',
  legendDen: '獸穴（走進對方的獸穴就贏了）',
};

export const welcome = '嗨！選好要怎麼玩，就可以開始囉！';

/** 棋盤下方的這一局設定摘要，例如「電腦・入門・你是紅方」。 */
export function setupSummary(mode: 'ai' | 'pvp', levelName: string, humanSide: Side): string {
  return mode === 'ai' ? `${ui.vsAi}・${levelName}・你是${SIDE[humanSide]}` : ui.vsHuman;
}

const color = (side: Side) => (side === 'red' ? '紅色' : '藍色');
export const turnPrompt = (side: Side) => `輪到${SIDE[side]}囉！點一隻${color(side)}外框的動物吧。`;
export const yourTurnPrompt = (side: Side) => `輪到你囉！點一隻${color(side)}外框的動物吧。`;
export const aiThinking = '電腦想一想…';
export const waitForAi = '等一下，電腦還在想喔！';
export const undone = '悔棋了！再想想看要怎麼走。';
export const pickFirst = '先點一隻動物喔！';
export const notYourTurn = (turn: Side) => `現在輪到${SIDE[turn]}喔！`;

export interface SelectContext {
  /** 站在敵方陷阱裡 */
  trapped: boolean;
  inWater: boolean;
  /** 獅、虎旁邊有河 */
  besideRiver: boolean;
  /** 獅、虎想跳的河裡有老鼠 */
  jumpBlocked: boolean;
}

/** 選中一隻動物時，牠說的話。 */
export function selectLine(type: AnimalType, ctx: SelectContext): string {
  const me = FULL[type];
  if (ctx.trapped) return `${me}：救命！我掉進陷阱了！`;
  switch (type) {
    case 'lion':
    case 'tiger':
      if (ctx.jumpBlocked) return `${me}：河裡有老鼠擋著，我跳不過去…`;
      if (ctx.besideRiver) return `${me}：我可以跳過河喔！`;
      return `${me}：吼～要去哪裡呢？`;
    case 'rat':
      return ctx.inWater ? '老鼠：游泳好好玩～' : '老鼠：我會游泳，還能吃大象喔！';
    case 'elephant':
      return '大象：我最大！可是我不敢吃老鼠…';
    case 'wolf':
      return '野狼：嗷嗚～要去哪裡呢？';
    case 'dog':
      return '小狗：汪汪！要去哪裡呢？';
    case 'cat':
      return '貓咪：喵～要去哪裡呢？';
    default:
      return `${me}：要去哪裡呢？`;
  }
}

export interface ReasonContext {
  mover: Piece;
  /** 目標格上的動物 */
  target: Piece | null;
  /** 攻擊方站在水裡 */
  moverInWater: boolean;
  turn: Side;
}

/** 不能走的原因 → 給小朋友看的說明。ownPiece 會改成選取那隻動物，所以沒有文字。 */
export function reasonLine(reason: PlayError, ctx: ReasonContext): string {
  const me = FULL[ctx.mover.type];
  switch (reason) {
    case 'notAdjacent':
      return '一次只能走上下左右一格喔！';
    case 'waterOnlyRat':
      return ctx.mover.type === 'lion' || ctx.mover.type === 'tiger'
        ? `${me}不會游泳，但可以一口氣跳過河！點對岸的腳印試試看。`
        : `只有老鼠會游泳喔！${me}不能下水。`;
    case 'ownDen':
      return '那是自己的家（獸穴），自己人不能進去喔！';
    case 'bankCapture':
      return ctx.moverInWater ? '老鼠在水裡，不能咬岸上的動物喔！' : '岸上的動物咬不到水裡的老鼠喔！';
    case 'jumpBlocked':
      return `河裡有老鼠擋住，${me}跳不過去！`;
    case 'rankTooLow':
      return ctx.target ? `${me}比${FULL[ctx.target.type]}小，吃不掉牠！` : '吃不掉牠！';
    case 'elephantVsRat':
      return '大象怕老鼠，不敢吃牠！';
    case 'noPiece':
      return pickFirst;
    case 'notYourTurn':
      return notYourTurn(ctx.turn);
    case 'ownPiece':
      return '';
    case 'offBoard':
    case 'gameOver':
      return '這裡不能走喔！';
  }
}

/** 走完一步的說明；next 是接下來輪到誰（例如「藍方」「你」「電腦」）。 */
export function moveLine(mover: Piece, victim: Piece | null, events: readonly GameEvent[], next: string): string {
  const me = FULL[mover.type];
  const has = (kind: GameEvent['kind']) => events.some(e => e.kind === kind);
  let line = '嘿咻！';
  if (has('enterTrap')) line = `${me}掉進陷阱了！等級變成 0，誰都可以吃掉牠！`;
  else if (victim) line = `${me}吃掉了${FULL[victim.type]}！`;
  else if (has('jump')) line = `咻～${me}跳過河了！`;
  else if (has('enterWater')) line = '撲通！老鼠下水游泳囉！';
  else if (has('leaveWater')) line = '老鼠上岸了！';
  else if (has('leaveTrap')) line = `${me}逃出陷阱了，等級恢復！`;
  return `${line}換${next}${next === '你' ? '了！' : '。'}`;
}

/**
 * 對局結束的標題；mover 是走最後一步的動物。
 * you：和電腦下時玩家是哪一方，結尾改成「你贏了」「電腦贏了」。
 */
export function resultLine(result: GameResult, mover: Piece, you?: Side): string {
  const { winner } = result;
  if (!winner) return '同樣的情形出現了三次，這盤平手！';
  const loser: Side = winner === 'red' ? 'blue' : 'red';
  const how =
    result.reason === 'den'
      ? `${FULL[mover.type]}衝進${SIDE[loser]}的獸穴`
      : result.reason === 'allCaptured'
        ? `${SIDE[winner]}把對方的動物都吃光了`
        : `${SIDE[loser]}沒有路可以走了`;
  if (!you) return `${how}，${SIDE[winner]}獲勝！`;
  return winner === you ? `${how}，你贏了！好厲害！` : `${how}，電腦贏了，再試一次吧！`;
}
