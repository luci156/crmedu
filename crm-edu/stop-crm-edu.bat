@echo off
chcp 65001 >nul
title CRM EDU - Stop Server
echo ========================================================
echo   Đang dừng tiến trình CRM EDU trên cổng 5173...
echo ========================================================

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Đang tắt tiến trình PID: %%a...
    taskkill /PID %%a /F >nul 2>&1
    set FOUND=1
)

if %FOUND% EQU 1 (
    echo [OK] Đã dừng thành công CRM EDU!
) else (
    echo [INFO] Không tìm thấy tiến trình nào đang chạy trên cổng 5173.
)

echo.
pause
