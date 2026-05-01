@echo off
REM Windows 一键发版: 提交 + push, GitHub Actions 自动部署到 solver.riverstonedevs.com
REM 用法: 双击 deploy.bat 或 PowerShell 跑 .\deploy.bat

cd /d %~dp0

echo.
echo ============================================
echo   Push -^> GitHub -^> Auto Deploy
echo ============================================
echo.

git status --short
echo.
set /p MSG="Commit message: "

if "%MSG%"=="" (
    echo No commit message, aborted.
    pause
    exit /b 1
)

git add .
git commit -m "%MSG%"
if errorlevel 1 (
    echo No changes to commit.
)

echo.
echo Pushing to GitHub...
git push

echo.
echo ============================================
echo Done. GitHub Actions will deploy in 1-3 min.
echo Check: https://github.com/ldragonk-glitch/edu-solver-demo/actions
echo Live:  https://solver.riverstonedevs.com
echo ============================================
echo.
pause
