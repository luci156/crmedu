@echo off
chcp 65001 >nul
title Open VS Code - CRM EDU
echo ========================================================
echo   Mở dự án CRM EDU trong Visual Studio Code
echo ========================================================

where code >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Đang mở VS Code tại D:\CRM-EDU...
    code D:\CRM-EDU
) else (
    echo [CẢNH BÁO] Chưa tìm thấy lệnh 'code' của VS Code trong PATH.
    echo.
    echo Cách mở thủ công:
    echo   1. Mở Visual Studio Code
    echo   2. Chọn File ^> Open Folder...
    echo   3. Chọn thư mục: D:\CRM-EDU
    echo.
    echo Cách kích hoạt lệnh 'code' từ Terminal:
    echo   Trong VS Code, nhấn Ctrl+Shift+P ^> gõ: Shell Command: Install 'code' command in PATH
    pause
)
