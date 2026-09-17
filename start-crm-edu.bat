@echo off
title CRM EDU - Khoi dong he thong
cls

echo ========================================================
echo   CRM EDU - Student and Attendance Management System
echo   He thong quan ly sinh vien va diem danh
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" (
    if exist "crm-edu\package.json" cd /d "%~dp0crm-edu"
)

if not "%~1"=="" goto CUSTOM_PORT

echo [INFO] Dang khoi dong CRM EDU tai cong 3000...
echo [INFO] Dia chi web: http://localhost:3000
echo.
call node node_modules\vite\bin\vite.js --port 3000 --host --open
goto END

:CUSTOM_PORT
echo [INFO] Dang khoi dong CRM EDU tai cong %~1...
echo [INFO] Dia chi web: http://localhost:%~1
echo.
call node node_modules\vite\bin\vite.js --port %~1 --host --open

:END
echo.
echo [THONG BAO] Server da dung.
pause
