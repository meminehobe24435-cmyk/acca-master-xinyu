@echo off
chcp 65001 > nul
title ⭐🐟 ACCA Master - 本地服务器
cd /d "%~dp0"

REM 本地 HTTP 调试：关闭 Secure Cookie 限制（生产 HTTPS 部署请删除此行）
set AUTH_INSECURE_COOKIE=1

echo ============================================
echo   ⭐🐟 ACCA Master
echo   ACCA 全科智能复习与刷题空间
echo ============================================
echo.
echo   本地地址:  http://127.0.0.1:3000
echo   学习端:    打开即用，无需登录
echo   管理后台:  http://127.0.0.1:3000/admin
echo              （口令见项目 .env 中的 ADMIN_PASSWORD）
echo.
echo   需要手机从公网访问？改用: start-public-tunnel.cmd
echo   关闭此窗口即可停止服务器。
echo ============================================
echo.

npm run start

if errorlevel 1 (
  echo.
  echo [!] 启动失败。请先在本目录执行: npm install ^&^& npm run setup
  pause
)
