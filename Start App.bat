@echo off
title Inventory Management App - Launcher
color 0A

echo ================================================
echo   Inventory Management System - Starting Up...
echo ================================================
echo.

:: Kill any existing Node.js server on port 3000
echo [1/4] Stopping any existing server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start the backend server in a new window
echo [2/4] Starting backend server...
start "Inventory Backend Server" cmd /k "E: && cd "Projects\Inventory Management Web App\backend" && npm start"
timeout /t 3 /nobreak >nul

:: Open the dashboard in the default browser
echo [3/4] Opening dashboard in browser...
start "" "E:\Projects\Inventory Management Web App\frontend\index.html"

:: Open DB Browser for SQLite with the database file (if installed)
echo [4/4] Opening database viewer...
set DB_FILE=E:\Projects\Inventory Management Web App\backend\data\inventory.db

if exist "C:\Program Files\DB Browser for SQLite\DB Browser for SQLite.exe" (
    start "" "C:\Program Files\DB Browser for SQLite\DB Browser for SQLite.exe" "%DB_FILE%"
) else if exist "C:\Program Files (x86)\DB Browser for SQLite\DB Browser for SQLite.exe" (
    start "" "C:\Program Files (x86)\DB Browser for SQLite\DB Browser for SQLite.exe" "%DB_FILE%"
) else (
    echo.
    echo  NOTE: DB Browser for SQLite is not installed.
    echo  Download it from: https://sqlitebrowser.org/dl/
    echo  Then re-run this launcher to open the database automatically.
    echo.
    pause
)

echo.
echo ================================================
echo   App is running!
echo   Dashboard : frontend/index.html (in browser)
echo   Server    : http://localhost:3000
echo   Database  : backend/data/inventory.db
echo ================================================
echo.
echo  Keep the "Inventory Backend Server" window open.
echo  Close it only when you're done using the app.
echo.
