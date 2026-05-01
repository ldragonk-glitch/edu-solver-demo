@echo off
title AI Math Solver Demo
cd /d %~dp0

echo.
echo  ============================================
echo    AI Math Solver Demo
echo  ============================================
echo.
echo  Server is starting...
echo  Browser will open automatically in 8 seconds.
echo.
echo  To stop: just close this window.
echo.

REM 后台 8 秒后开浏览器, 给 next dev 编译时间
start "" cmd /c "timeout /t 8 /nobreak > nul && start http://localhost:3000"

npm run dev

pause
