@echo off
chcp 65001 >nul
title CRM Edu - Dang khoi dong...
color 0A

echo.
echo  ==========================================
echo   CRM Edu - He Thong Quan Ly Diem Danh
echo  ==========================================
echo.

:: Kiem tra Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Node.js chua duoc cai dat!
    echo.
    echo  Tai Node.js tai: https://nodejs.org
    echo  Cai xong chay lai file nay.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0.."

:: Cai dependencies neu chua co
if not exist "node_modules" (
    echo [1/2] Cai dat thu vien lan dau ^(chi mat 1 lan^)...
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install that bai!
        pause
        exit /b 1
    )
) else (
    echo [OK] Thu vien da co san.
)

echo.
echo [2/2] Khoi dong may chu...
echo.

:: Chay Vite va tu dong mo trinh duyet khi server san sang
call npx vite --open

pause
