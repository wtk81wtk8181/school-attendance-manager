@echo off
chcp 65001 >nul
title 萬鈞伯裘書院｜出勤管理平台
cd /d "%~dp0"

echo.
echo ========================================
echo   萬鈞伯裘書院｜學生出勤與請假管理平台
echo   本機網址：http://127.0.0.1:43180
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 未偵測到 Node.js。
  echo 請先安裝 LTS 版本，安裝後重開本視窗再試。
  echo 下載：https://nodejs.org/zh-tw/download
  start https://nodejs.org/zh-tw/download
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/2] 首次執行，正在安裝套件，請稍候...
  call npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗。請確認網路正常且 Node.js 為 LTS 版本。
    pause
    exit /b 1
  )
  echo.
) else (
  echo [1/2] 套件已就緒，略過安裝。
  echo.
)

echo [2/2] 正在啟動開發伺服器...
echo 啟動後請用瀏覽器開啟：http://127.0.0.1:43180
echo 按 Ctrl+C 可停止伺服器。
echo.

timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:43180

call npm run dev

echo.
echo 伺服器已停止。
pause
