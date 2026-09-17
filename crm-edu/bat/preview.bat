@echo off
chcp 65001 >nul
title CRM Edu - Preview Build
echo.
echo  Khoi dong preview server...
echo  Truy cap: http://localhost:4173
echo.
cd /d "%~dp0.."
call npm run preview
pause
