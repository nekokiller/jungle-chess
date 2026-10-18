// 動畫時間常數（毫秒），數值來自原型，見架構文件 7.4 節。

export const T = {
  step: 400, //          蹦跳一格
  jump: 760, //          跳河
  captureAt: 0.6, //     攻擊方移動到 60% 時被吃方開始消失
  poof: 460, //          被吃縮小旋轉
  poofDelay: 170, //     被吃方先露出 > < 表情
  afterCapture: 120,
  headshake: 560, //     不能走
  happyFace: 900, //     吃子後開心的表情
  winOverlay: 900, //    進入獸穴後多久顯示勝利畫面
  blinkMin: 2200,
  blinkRange: 3800,
} as const;

/** 減少動態效果：由對局 store 依系統設定與遊戲內開關更新。 */
export const prefs = { reduced: false };
