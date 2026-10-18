# Git 規範

## Commit Message 格式（Conventional Commits）

```text
<type>(scope): <繁中說明>
```

- `(scope)` 可省略，例如 `docs: 新增玩法調查文件`。

| type | 用途 |
| --- | --- |
| `feat` | 新功能／新系統 |
| `fix` | 修補 bug |
| `refactor` | 重構（不動玩法邏輯） |
| `perf` | 效能改善（例如 AI 搜尋速度） |
| `style` | 純格式調整（縮排、空白、排版，不影響行為） |
| `docs` | 純文件變更 |
| `test` | 新增或修改測試 |
| `chore` | 建置設定、套件更新等雜務 |

建議 scope：

| scope | 範圍 |
| --- | --- |
| `rules` | 規則引擎（走法、吃子、勝負判定） |
| `ai` | AI 對手與難度 |
| `ui` | 畫面、操作、動畫、音效 |
| `pvp` | 雙人對戰 |
| `docs` | 文件 |

- 主旨與正文說明一律使用繁體中文；主旨應聚焦變更目的，正文補充範圍、原因與驗證即可。

## 共同作者署名（每則必填）

每則 commit message 的結尾必須與正文空一行，再附上當次 session 實際模型的 trailer；`<email>` 不可省略：

```text
Co-Authored-By: <當前 session 模型顯示名> <供應商 noreply email>
```

不要照抄範例模型名稱；email 依供應商（如 Codex 用 `<noreply@openai.com>`）；不確定目前模型顯示名或 email 時，先詢問使用者。工具自動附加、但與當次實際模型不符的署名，不得保留。

## 分支規範

- 不直接在 `main` 上 commit；每項工作開新分支，完成後以 PR 合併回 `main`；合併後**保留**開發分支，不要刪除。
- 分支命名：`<type>/<英文簡述>`，type 與上方 commit type 相同，簡述用小寫英文與 `-` 連接。
  - 例：`feat/ai-difficulty`、`fix/rat-river-capture`、`docs/evaluation-research`

## 提交與自檢方式

1. **多行 message 一律使用暫存檔搭配 `git commit -F <路徑>`**；避免 PowerShell here-string 與 Bash heredoc 混用而在 message 首尾留下 `@`。
   - 暫存檔必須是 **UTF-8（無 BOM）**。Windows PowerShell 5.1 的 `Out-File`、`>` 預設會寫成 UTF-16 或帶 BOM，造成中文亂碼或 message 開頭多出怪字元。可用：
     - Bash：`cat > <路徑> <<'EOF'` … `EOF`
     - PowerShell：`[IO.File]::WriteAllText('<路徑>', $msg, [Text.UTF8Encoding]::new($false))`
   - 暫存檔放在 repo 外（系統暫存目錄）或 `.git/` 目錄內，避免被誤 commit；用完即刪。
2. 單行 message 可用 `git commit -m "..."`；若直接輸入多行訊息，shell 與語法必須一致。
3. commit 後執行：
   ```bash
   git log -1 --format=%B
   ```
   確認開頭／結尾無多餘字元、最後一行有正確 `Co-Authored-By`（含 email）。若遺漏，未 push 前以 `git commit --amend` 補正。
4. **已 push 的 commit 不得 amend 或 force push**；發現錯誤時，另提交一筆修正 commit。
