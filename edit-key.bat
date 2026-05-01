@echo off
REM 双击此文件即可用记事本编辑 .env.local
cd /d %~dp0

if not exist ".env.local" (
    echo .env.local 不存在, 正在从模板创建...
    copy ".env.local.example" ".env.local"
    echo.
)

notepad ".env.local"
