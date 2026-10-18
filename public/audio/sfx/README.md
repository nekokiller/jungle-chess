# 核心音效資產 v1

製作日期：2026-10-18。完整 **15 個核心音效**，每個提供 WAV 母檔與 MP3 網頁版；2026-10-18 已接入遊戲，觸發時機見[音效規劃第 9 節](../../../docs/architecture/audio-plan.md#9-遊戲整合2026-10-18)。

## 試聽與清單

開啟 [試聽頁](../../audio-preview/index.html)，點「15 個核心音效」可重播整套。編號 01–05 沿用原本試聽順序，其 WAV 與最初確認過的樣本逐位元組一致；MP3 為各 WAV 的壓縮版本。

**2026-10-18 試聽通過：** 使用者確認「已試聽，沒問題」，15 個核心音效的聽感均已通過。`approvals.json` 記錄該批 WAV／MP3 的雜湊；重建時內容若改變，清單會回到待試聽狀態。

| 編號 | 音效 ID | 檔名（均有 `.wav` 與 `.mp3`） | 實際 WAV 長度 | 試聽狀態 |
|---|---|---|---|---|
| 01 | `piece.land` | `piece-land-v1` | 0.20 秒 | 已試聽通過 |
| 02 | `piece.capture` | `piece-capture-v1` | 0.34 秒 | 已試聽通過 |
| 03 | `water.enter` | `water-enter-v1` | 0.36 秒 | 已試聽通過 |
| 04 | `move.invalid` | `move-invalid-v1` | 0.26 秒 | 已試聽通過 |
| 05 | `game.win` | `game-win-v1` | 1.75 秒 | 已試聽通過 |
| 06 | `ui.tap` | `ui-tap-v1` | 0.09 秒 | 已試聽通過 |
| 07 | `piece.select` | `piece-select-v1` | 0.15 秒 | 已試聽通過 |
| 08 | `piece.jump` | `piece-jump-v1` | 0.32 秒 | 已試聽通過 |
| 09 | `water.exit` | `water-exit-v1` | 0.24 秒 | 已試聽通過 |
| 10 | `water.step` | `water-step-v1` | 0.20 秒 | 已試聽通過 |
| 11 | `trap.enter` | `trap-enter-v1` | 0.30 秒 | 已試聽通過 |
| 12 | `trap.leave` | `trap-leave-v1` | 0.23 秒 | 已試聽通過 |
| 13 | `game.start` | `game-start-v1` | 0.62 秒 | 已試聽通過 |
| 14 | `game.encourage` | `game-encourage-v1` | 1.12 秒 | 已試聽通過 |
| 15 | `game.draw` | `game-draw-v1` | 0.95 秒 | 已試聽通過 |

原通過樣本包含部分超過規劃建議區間的長度，保留實際通過版本，不為符合初始估計重新裁切。

## 格式與來源

- WAV：48 kHz、16-bit PCM、單聲道；全套 685,140 bytes（約 685 KB）。
- MP3：48 kHz、128 kbps、單聲道；全套 128,547 bytes（約 129 KB），低於規劃的 500 KB 傳輸目標。該目標只計網頁版 MP3，不包含母檔或試聽封存樣本。
- 來源：本專案原創程式合成，以正弦波、諧波、包絡與固定種子噪音製作；未使用第三方錄音、音樂、素材包或模型生成音訊，無外部素材署名義務。本說明不另行設定專案授權條款。
- 已通過的五個來源保留在 `public/audio-preview/samples/` 作比對基準；其餘由 `scripts/generate_core_audio.py` 產生。
- [manifest.json](manifest.json) 記錄每個 ID、檔案、來源、試聽狀態、實際長度、峰值、RMS、大小、SHA-256 與編碼器版本。來源音檔路徑以 `public/` 為基準，腳本路徑以專案根目錄為基準。

## 重建方式

需要 Python 與可在 PATH 找到的 FFmpeg（含 libmp3lame）：

```powershell
python scripts/generate_core_audio.py
```

此命令覆寫正式目錄內的 15 組音檔、`manifest.json` 與試聽頁的 `catalog.js`；不覆寫已通過的五個封存樣本。要調整已通過音檔時，應另製作新版本並重新試聽。

新音效採每個 ID 獨立的固定亂數種子。同一 Python／FFmpeg 環境可重建一致內容；不同 MP3 編碼器版本可能產生不同位元組，以 WAV 母檔作音色基準。

## 驗證範圍

產生流程檢查全部 WAV 格式、長度、首尾樣本、非靜音與峰值餘裕，並將全部 MP3 解碼檢查取樣長度與峰值。這些量測不代替主觀聽感或遊戲內混音驗收；多聲疊播仍需未來播放器的增益控制。

交付檢查通過：15 個 ID 與規劃完整對應、30 個檔案大小與 SHA-256 正確、5 個已通過 WAV 與封存原檔一致；試聽頁 JavaScript 語法及全部 HTTP 音檔回應正確。同環境再次重建後，全部 30 個音檔與清單內容一致。更新後的瀏覽器播放控制尚未自動驗證。

15 個核心音效已由使用者試聽通過。遊戲事件、動畫同步、播放冷卻與 PWA 快取在後續整合中實作（見音效規劃第 9 節）。
