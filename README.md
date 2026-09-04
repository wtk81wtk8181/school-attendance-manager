# 萬鈞伯裘書院｜學生出勤與請假管理平台

校務處與班主任使用的出勤、請假審核與缺席預警系統。老師只需在 eClass 點名，數據會同步至此平台。

示範學校為 **萬鈞伯裘書院（Man Kwan Pak Kau College）**，學年為 **2026-2027**。

## 功能

- **eClass 數據整合**：模擬老師在 eClass 標記出席、缺席、請假後同步至本平台。
- **每日全校缺席名單**：按班自動整合當日缺席／請假，匯出 Excel，並電郵給指定收件人（校務處、各班班主任等）。每日到達設定時間，或 eClass 同步完成後，會自動寄出。
- **出席率計算**：出席率 =（總上課日數 − 計入缺席日數）÷ 總上課日數。獲批請假（醫生證明或家長信）不計入；未批准請假或無故缺席會計入。
- **缺席上限與預警**
  - 中一至中五：不可超過 9 天；達 4 天發出警告信。
  - 中六：不可超過 4.5 天；達 2 天發出警告信。
  - 達標時自動產生警告信（可列印／另存 PDF）並通知校務處。
- **文件審核**：校務處核對缺席原因、醫生證明／家長信，並更新批准狀態。
- **角色**
  - 校務處職員：管理缺席、審核文件、跟進警告信、設定收件人與每日電郵。
  - 班主任：只可檢閱本班出勤與缺席詳情。
  - 老師：只在 eClass 點名，無需登入本平台。
- **報表**：按年級、班別、日期匯出出席率、缺席統計與警告信存檔（CSV）；每日缺席報告可匯出 PDF（學生姓名、請假原因、致電人士及致電時間）。

## 部署到 Firebase（建議）

本專案為 **Next.js 全端應用**（含 API 路由 `/api/digest/send`），適合使用 **Firebase App Hosting**，不適合純靜態 Hosting。

### 前置條件

1. [Firebase 專案](https://console.firebase.google.com/)
2. 程式碼在 **GitHub**（App Hosting 可連接 repo 自動部署）
3. [Firebase CLI](https://firebase.google.com/docs/cli)（選用，本機或 CI 手動 deploy 時需要）

### 第一次設定（Firebase Console）

1. 進入 **Hosting & Serverless → App Hosting → Create backend**
2. 連接 GitHub，選 repo：`wtk81wtk8181/school-attendance-manager`
3. **Live branch**：`main`
4. **App root directory**：`/`（repo 根目錄，內有 `package.json`）
5. **Region**：建議 `asia-east2`（香港）或 `asia-east1`（台灣）
6. 啟用 **Automatic rollouts**（push 到 main 即自動上線）

### Push 後自動部署

```bash
git push origin main
```

Firebase 會執行 `npm install`、`next build`，並把 SSR 與 API 部署到 Cloud Run，靜態資源走 CDN。

### 手動部署（CLI）

```bash
npm install -g firebase-tools
firebase login
# 編輯 .firebaserc，把 your-firebase-project-id 改成你的 Firebase 專案 ID
firebase apphosting:backends:create --project YOUR_PROJECT_ID
firebase deploy --only apphosting
```

### 環境變數（SMTP，可選）

未設定時，每日缺席 Excel 仍會以**模擬寄出**方式運作。若要真實發信，在 Firebase Console：

**App Hosting → 你的 backend → Settings → Environment**

加入（參考 `.env.example`）：

- `SMTP_HOST`
- `SMTP_PORT`（例如 `587`）
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_FROM_NAME`（選填，寄件顯示名稱，例如：萬鈞伯裘書院校務處）

### 上線後注意

- 示範數據存在每位使用者的 **瀏覽器 localStorage**，換裝置或清除網站資料會重置
- 若要全校共用資料，日後需改接 Firestore 等雲端資料庫
- 上線網址形如：`https://BACKEND_ID--PROJECT_ID.asia-east2.hosted.app`

## Windows 本機執行（建議先在本機試用）

Cloud Agent 在遠端執行，**無法直接改到你的 Windows 電腦**。請在本機：

1. 安裝 [Node.js LTS](https://nodejs.org/zh-tw/download)
2. 從 Cursor Agent 的 **Artifacts** 下載 `school-attendance-windows.zip` 並解壓  
   （Agent：https://cursor.com/agents/bc-a83f44ad-fef4-48ce-a06a-9c0f49d68d25）
3. **雙擊 `start.bat`**，瀏覽器開 http://127.0.0.1:43180

詳細圖文步驟見 **`WINDOWS-本機執行.md`**。

## 本機開發（Mac / WSL / Cursor Agent）

需要 Node.js 18 或以上。

```bash
npm install
npm run dev
```

瀏覽器開啟 http://127.0.0.1:43180 。

示範帳號（無需密碼，於登入頁選擇角色）：

| 姓名 | 角色 | 權限 |
| --- | --- | --- |
| 負責職員 | 校務處及學生部 | 全權管理 |
| 老師 | 班主任／任教老師 | 登入後選班（中一至中六，每級 A–E），唯讀該班出勤 |

數據在已設定 Postgres（Vercel／Neon）時會寫入資料庫 `app_snapshots`，全校共用。登入角色仍存在本機瀏覽器。未設定資料庫時，會退回瀏覽器 `localStorage`。可於「eClass 同步」頁還原示範數據。

### 真實電郵（可選）

未設定 SMTP 時，每日名單會**模擬寄出**並下載 Excel，方便本機示範。若要真正發信，複製 `.env.example` 為 `.env.local` 後填入：

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=萬鈞伯裘書院校務處
```

## 部署到 Vercel（GitHub + Postgres）

1. 把程式碼 push 到 GitHub
2. 在 [Vercel](https://vercel.com/new) 匯入該 repo
3. **Storage → Create Database → Neon / Postgres**，並把 `DATABASE_URL` 或 `POSTGRES_URL` 接到專案
4. Redeploy 一次

本機若要連同一資料庫，把 Vercel 的連線字串放到 `.env.local`：

```
DATABASE_URL=postgresql://...
```

## 技術

Next.js、TypeScript、Tailwind CSS、shadcn/ui、ExcelJS、Nodemailer、Neon／Vercel Postgres。
