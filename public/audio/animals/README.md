# 八種動物叫聲資產 v1

製作日期：2026-10-18。象、獅、虎、豹、狼、狗、貓、鼠各一個短叫聲，提供 **8 個 WAV 母檔＋8 個 MP3 網頁版**，2026-10-18 已接入遊戲（選取動物時播放）。全部為原創合成卡通角色聲，並非真實動物錄音或自然聲音教材。

在[試聽頁](../../audio-preview/index.html)點「8 種動物叫聲」即可依序播放，也可逐一播放或下載。這八個音效目前均待使用者試聽確認。

## 資產清單

| 編號 | 動物 | 音效 ID | 檔名（`.wav`／`.mp3`） | 長度 | 聲音方向 |
|---|---|---|---|---|---|
| A01 | 象 | `animal.elephant.select` | `elephant-call-v1` | 0.52 秒 | 圓潤、帶鼻音的短「噗嗚」 |
| A02 | 獅 | `animal.lion.select` | `lion-call-v1` | 0.56 秒 | 低沉、有胸腔感的小「嗷」 |
| A03 | 虎 | `animal.tiger.select` | `tiger-call-v1` | 0.51 秒 | 兩段短促「嗷嗚」，與獅子區別 |
| A04 | 豹 | `animal.leopard.select` | `leopard-call-v1` | 0.40 秒 | 輕巧顫動的「嗚嚕」 |
| A05 | 狼 | `animal.wolf.select` | `wolf-call-v1` | 0.60 秒 | 柔和上揚的短「嗚～」 |
| A06 | 狗 | `animal.dog.select` | `dog-call-v1` | 0.30 秒 | 一聲友善短「汪」 |
| A07 | 貓 | `animal.cat.select` | `cat-call-v1` | 0.52 秒 | 鼻音轉張口、再收尾的「喵」 |
| A08 | 鼠 | `animal.rat.select` | `rat-call-v1` | 0.32 秒 | 兩個圓潤「吱啾」 |

## 格式、來源與音量

- WAV：48 kHz、16-bit PCM、單聲道；合計 **358,432 bytes**（約 358 KB）。
- MP3：48 kHz、128 kbps、單聲道；合計 **67,560 bytes**（約 68 KB），低於 500 KB 目標。
- 聲音以基頻曲線、諧波、移動共振峰、氣息噪音與顫動合成，配合短淡入淡出；未使用第三方錄音、素材包或模型生成音訊，無外部素材署名義務。本說明不另行設定專案授權條款。
- 使用相近 RMS 目標並限制峰值，避免同音量試聽時落差過大；仍需以耳機與手機喇叭試聽確認感知音量與辨識度。
- [manifest.json](manifest.json) 記錄每個檔案的 ID、來源、時長、峰值、RMS、大小、SHA-256、編碼器版本與試聽狀態。

## 重建與驗證

專案根目錄執行（需要 Python 與 PATH 上含 libmp3lame 的 FFmpeg）：

```powershell
python scripts/generate_animal_audio.py
```

會覆寫此目錄的八組音檔、`manifest.json` 與 `public/audio-preview/animals-catalog.js`；不改動核心音效資產。每種動物使用獨立固定亂數種子；同一環境可重建一致內容，不同 MP3 編碼器版本可能產生不同位元組。

產生流程檢查 WAV 格式、首尾樣本、時長、非靜音、峰值餘裕，並將 MP3 解碼核對取樣長度、有效數值與峰值。新增叫聲仍需主觀試聽；遊戲內的選取觸發、叫聲開關、冷卻、淡出與混音留待整合階段。
