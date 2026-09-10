@echo off
chcp 65001 > nul
title ACCA Master - 本地服务器
cd /d "%~dp0"

REM 本地 HTTP 调试：关闭 Secure Cookie 限制（生产 HTTPS 部署请删除此行）
set AUTH_INSECURE_COOKIE=1

echo ============================================
echo   ACCA Master - ACCA 全科智能复习与刷题平台
echo ============================================
echo.
echo   地址:  http://127.0.0.1:3000
echo   学员:  demo@example.com  / demo1234
echo   管理员: admin@example.com / admin1234
echo.
echo   关闭此窗口即可停止服务器。
echo ============================================
echo.

npm run start

if errorlevel 1 (
  echo.
  echo [!] 启动失败。请先执行: npm install ^&^& npm run setup
  pause
)
