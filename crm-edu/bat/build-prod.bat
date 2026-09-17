@echo off
chcp 65001 >nul
title CRM Edu - Production Build
echo.
echo  ============================================
echo   CRM Edu - Tao ban production
echo  ============================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Node.js chua duoc cai dat!
    pause
    exit /b 1
)

cd /d "%~dp0.."

echo [1/2] Cai dat phu thuoc...
call npm install
if errorlevel 1 (
    echo [LOI] npm install that bai!
    pause
    exit /b 1
)

echo.
echo [2/2] Build production...
call npm run build
if errorlevel 1 (
    echo [LOI] Build that bai!
    pause
    exit /b 1
)

echo.
echo  Build thanh cong!
echo  File o thu muc: dist\
echo.
echo  De preview ban build:
echo    npm run preview
echo    Hoac chay: bat\preview.bat
echo.
pause
