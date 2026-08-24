# Windows 本機執行（3 步驟）

Cloud Agent **無法直接操作你的 Windows 電腦**。請在你自己的 PC 依下列步驟執行，效果與 Agent 預覽相同。

---

## 第 1 步：安裝 Node.js

1. 開啟 https://nodejs.org/zh-tw/download
2. 下載並安裝 **LTS** 版本（建議 20.x 或以上）
3. 安裝完成後，開 **命令提示字元（CMD）**，輸入：

```cmd
node -v
npm -v
```

有顯示版本號即成功。

---

## 第 2 步：取得程式

任選一種方式：

### A. 從 Cursor 下載 zip（最快）

1. 開啟 Agent 頁面：https://cursor.com/agents/bc-a83f44ad-fef4-48ce-a06a-9c0f49d68d25
2. 在 **Artifacts** 下載 `school-attendance-windows.zip`
3. 解壓到例如：`C:\Users\你的使用者名稱\Documents\school-attendance-manager`

### B. 從 GitHub clone（若 repo 已有程式）

```cmd
cd C:\Users\你的使用者名稱\Documents
git clone https://github.com/wtk81wtk8181/school-attendance-manager.git
cd school-attendance-manager
```

---

## 第 3 步：雙擊啟動

1. 進入解壓後的資料夾
2. **雙擊 `start.bat`**
3. 第一次會執行 `npm install`（約 1–3 分鐘）
4. 瀏覽器會開啟：http://127.0.0.1:43180

要停止伺服器：在黑色視窗按 `Ctrl + C`，或直接關閉視窗。

---

## 示範登入

| 姓名 | 角色 | 說明 |
| --- | --- | --- |
| 負責職員 | 校務處 | 全功能 |
| 老師 | 班主任 | 選班後唯讀 |

資料存在瀏覽器 **localStorage**，換電腦或清除網站資料會重置。可在「eClass 同步」還原示範數據。

---

## 常見問題

| 問題 | 解決 |
| --- | --- |
| `'node' 不是內部或外部命令` | 未安裝 Node.js，或需重開 CMD / 重開機 |
| `'npm' 不是內部或外部命令` | 同上 |
| 瀏覽器打不開 | 等 `npm install` 完成；確認視窗沒有紅色錯誤 |
| 43180 連線被拒 | 防火牆可暫時允許 Node.js；或改執行 `npm run dev` 看錯誤訊息 |
| 想部署上線 | 見 `DEPLOY-WINDOWS.md`（GitHub + Vercel / Firebase） |

---

## 手動指令（可選）

若不想用 bat，在專案資料夾開 CMD：

```cmd
npm install
npm run dev
```

瀏覽器開 http://127.0.0.1:43180
