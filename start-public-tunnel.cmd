@echo off
chcp 65001 > nul
title ACCA Master - 公网访问（临时隧道）
cd /d "%~dp0"

set AUTH_INSECURE_COOKIE=1

echo ============================================
echo   ⭐🐟 ACCA Master - 公网访问
echo ============================================
echo.
echo   1) 启动本地服务（http://127.0.0.1:3000）
echo   2) 建立 Cloudflare 隧道并打印公网 HTTPS 地址
echo.
echo   注意：此地址在本窗口保持打开时有效，重启会变化。
echo   永久地址请在 README 的「部署」章节按步骤部署到 Vercel / Render。
echo ============================================
echo.

if not exist ".tools\cloudflared.exe" (
  echo [!] 未找到 .tools\cloudflared.exe
  echo     请先执行:  mkdir .tools  ^&^&  curl -L -o .tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  pause
  exit /b 1
)

start "ACCA Master Server" cmd /c "npm run start"

timeout /t 8 /nobreak > nul

echo [*] 正在申请临时公网地址（约 10 秒）...
.tools\cloudflared.exe tunnel --url http://127.0.0.1:3000 --no-autoupdate

echo.
echo [*] 隧道已结束。按任意键关闭窗口。
pause > nul
