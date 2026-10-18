# 動物叫聲與核心音效試聽

另有 [BGM 試作：林間小棋步](bgm.html)，提供 48 秒循環音樂試聽；製作方向、音檔與重建方式見 [BGM 資產說明](../audio/bgm/README.md)。

2026-10-18 已完成 15 個核心音效與 8 種動物叫聲，尚未接入遊戲動畫。完整清單、格式與重建方式見[核心音效資產說明](../audio/sfx/README.md)與[動物叫聲資產說明](../audio/animals/README.md)。動物叫聲為合成卡通角色聲，非真實動物錄音。

**試聽結果：** 使用者先確認五個代表樣本，並於 2026-10-18 確認完整 15 個核心音效「已試聽，沒問題」。動物叫聲 A01–A08 為新製作，待試聽；此確認不涵蓋遊戲動畫同步與跨裝置驗收。

## 開啟試聽頁

- 直接用瀏覽器開啟本目錄的 `index.html`，音檔使用相對路徑。
- 已啟動 Vite 開發伺服器時，前往 `/audio-preview/`。
- 也可在專案根目錄執行 `python -m http.server 4175 --bind 127.0.0.1 --directory public`，開啟 `http://127.0.0.1:4175/audio-preview/`。

試聽頁提供單獨播放、8 種動物／15 個核心音效／全部 23 個依序播放、停止、音量調整與 MP3／WAV 下載。播放來源為 `../audio/animals/` 與 `../audio/sfx/` 的 MP3，清單由 `animals-catalog.js` 與 `catalog.js` 載入，直接開啟 HTML 時也不需 fetch。依序播放間隔 700 ms；切換音效或離開分頁會停止原本播放。初始音量 50%，不自動播放。

## 已通過的五個封存樣本

| 檔案 | 用途 | 時長 |
|---|---|---|
| `samples/piece-land-v1.wav` | 木質落地 | 0.20 秒 |
| `samples/piece-capture-v1.wav` | 氣泡與星星吃子 | 0.34 秒 |
| `samples/water-enter-v1.wav` | 老鼠入水 | 0.36 秒 |
| `samples/move-invalid-v1.wav` | 溫和無效走法提醒 | 0.26 秒 |
| `samples/game-win-v1.wav` | 木琴勝利旋律 | 1.75 秒 |

全部為 48 kHz、16-bit、單聲道 PCM WAV，合計約 280 KB。以正弦波、諧波、包絡與固定亂數噪音合成，無外部錄音或第三方音樂素材。這批樣本的聽感已確認；正式音檔格式與整合後的混音仍依音效規劃驗收。

`scripts/generate_audio_samples.py` 是原始五音的來源腳本（執行會覆寫封存的五個 WAV，不用於日常重建正式資產）。完整 15 音請執行 `python scripts/generate_core_audio.py`，會保留封存樣本並重建正式音檔與試聽清單。

動物叫聲執行 `python scripts/generate_animal_audio.py` 重建，不改動核心音效。兩組資產均保留獨立的清單與產生流程。

驗證紀錄：15 個核心音效已由使用者試聽通過；8 種動物叫聲待試聽。資產完成格式、峰值與 MP3 解碼檢查。代理環境沒有可連線控制的瀏覽器，更新後播放控制與跨瀏覽器行為尚未由代理完成驗證。
