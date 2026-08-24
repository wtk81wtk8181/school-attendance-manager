# Windows 部署指南（不用 Origin CLI）

`origin` 指令在 **Windows CMD / PowerShell 無法使用**，只支援 macOS、Linux 或 **WSL**。

若你要部署到 **Firebase**，建議用以下方法（不需 `origin auth login`）。

---

## 方法一：GitHub + Firebase App Hosting（建議）

### 1. 取得最新程式

從 Cursor Agent 下載打包好的 zip，或在本 repo 解壓後使用。

### 2. 安裝 Git for Windows

下載：https://git-scm.com/download/win

### 3. 推到 GitHub

在 GitHub 建立新 repo（例如 `school-attendance-manager`），然後在 **PowerShell** 執行：

```powershell
cd C:\Users\MKPC\Downloads\school-attendance-manager
git init
git add .
git commit -m "Initial commit from Cursor agent"
git branch -M main
git remote add origin https://github.com/wtk81wtk8181/school-attendance-manager.git
git push -u origin main
```

（GitHub 會要求登入或 Personal Access Token。）

### 4. 連接 Firebase

1. 打開 https://console.firebase.google.com/
2. **Hosting & Serverless → App Hosting → Create backend**
3. 連接 GitHub，選剛才的 repo
4. Live branch：`main`，Region：`asia-east2`
5. 之後每次 `git push`，Firebase 自動 build 並上線

---

## 方法二：Firebase CLI 直接部署

### 1. 安裝 Node.js LTS

https://nodejs.org/zh-tw/download

### 2. 安裝 Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
```

### 3. 在專案目錄部署

```powershell
cd C:\Users\MKPC\Downloads\school-attendance-manager
npm install
```

編輯 `.firebaserc`，把 `your-firebase-project-id` 改成你的 Firebase 專案 ID。

```powershell
firebase apphosting:backends:create --project 你的專案ID
firebase deploy --only apphosting
```

---

## 方法三：用 WSL 使用 Origin CLI（可選）

若你一定要 push 到 `origin.cursor.com`：

1. 在 PowerShell（管理員）執行：`wsl --install`
2. 重開機，進入 Ubuntu (WSL)
3. 在 WSL 內執行：

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
origin auth login
git clone https://origin.cursor.com/tk-wong/school-attendance-manager.git
```

注意：Cloud Agent 上最新的 17 個 commit 可能仍未在 Origin 遠端，建議仍用 **方法一 zip + GitHub** 最穩。

---

## 常見問題

| 問題 | 解決 |
| --- | --- |
| `'origin' 不是內部或外部命令` | 正常；Windows CMD 沒有 Origin CLI，用上面方法一或三 |
| Firebase 要 GitHub | App Hosting 預設連 GitHub；可先 push 到 GitHub 再連 Firebase |
| 資料會不會消失 | 示範資料在瀏覽器 localStorage，換電腦會重置 |
