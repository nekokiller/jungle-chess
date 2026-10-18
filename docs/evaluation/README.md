# 鬥獸棋玩法調查（docs/evaluation）

> 調查日期：2026-10-18
> 目的：在開發「給小朋友玩的鬥獸棋（動物棋）」之前，先收集遊戲玩法、規則差異，以及參考網站 [AI Games Spark](https://aigamespark.com/?lang=zh-TW) 的功能設計。

## 文件列表

| 文件 | 內容 |
|---|---|
| [01-game-rules.md](01-game-rules.md) | 完整規則：棋盤、地形座標、初始盤面、等級、走法、跳河、吃子、陷阱、勝負，以及實作檢查清單 |
| [02-rule-variants.md](02-rule-variants.md) | 各來源的規則差異比較，以及本專案建議採用的預設規則 |
| [03-reference-site-analysis.md](03-reference-site-analysis.md) | 參考網站分析：遊戲模式、六檔 AI 的參數與演算法、介面功能、錯誤提示文字 |

## 一頁看懂鬥獸棋

- **棋盤**：7 欄 × 9 列。每方底線中央有一個**獸穴**，獸穴周圍有三個**陷阱**；棋盤中間有兩條**河**。
- **棋子**：每方 8 隻動物，**象 ＞ 獅 ＞ 虎 ＞ 豹 ＞ 狼 ＞ 狗 ＞ 貓 ＞ 鼠**。
- **走法**：每次上下左右走一格。
- **吃子**：大吃小、同級互吃。特例是**鼠可以吃象，象不能吃鼠**。
- **河流**：只有鼠能下水；獅和虎可以跳過河，但河裡有鼠就跳不過去。
- **陷阱**：敵人走進我的陷阱就變得最弱，我方誰都能吃牠。
- **獲勝**：走進對方獸穴，或吃光對方所有動物（或讓對方沒棋可走）。

## 參考網站重點

- 三種模式：**雙人對戰**（線上配對／好友房間）、**人機對戰**（本機 AI）、**AI 對弈**（雲端 AI）。
- AI 有**六檔棋力**：入門、簡單、中等、困難、高手、大師。差別在搜尋深度（1～6 層）、思考時間和隨機程度。
- 輔助功能：合法落點提示、走錯時說明原因、提示建議走法、悔棋／重做、翻轉棋盤、計時、棋譜。

## 對兒童版的初步啟示

1. **規則跟參考網站一致**（詳見 [02-rule-variants.md](02-rule-variants.md) 第 2 節）。
2. **走錯時要說明原因**，而且用小朋友看得懂的話，例如「大象不敢吃老鼠喔！」。參考網站的錯誤提示可以當作清單，再改寫成兒童語氣。
3. **一定要顯示合法落點**，必要時可以標示「這一步會被吃掉」，幫助小朋友學習。
4. **低難度 AI 要讓小朋友贏得到**，入門、簡單兩檔應保留明顯的隨機失誤。
5. **同一台裝置兩人對戰**（爸媽和小朋友、兄弟姊妹）很重要，可以比線上配對更早做。
6. 動物用**圖案**呈現，同時標示等級數字，小朋友不識字也能玩。

## 參考來源

- [AI Games Spark — 線上玩鬥獸棋](https://aigamespark.com/zh-tw/鬥獸棋/)
- [Wikipedia — Jungle (board game)](https://en.wikipedia.org/wiki/Jungle_(board_game))
- [維基百科 — 鬥獸棋](https://zh.wikipedia.org/zh-tw/鬥獸棋)
- [Leiden University — About Dou Shou Qi](https://liacs.leidenuniv.nl/~visjk/doushouqi/about.html)
- [YM Imports — How to Play Jungle](https://www.ymimports.com/pages/how-to-play-jungle)
- [A Note on Computational Complexity of Dou Shou Qi（arXiv:1904.13205）](https://arxiv.org/abs/1904.13205)
