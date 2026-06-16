@echo off
cd /d "E:\Projects\Inventory Management Web App"

echo === Supplier Quotations Sort Fix ===
echo.

:: Kill any lingering git processes
taskkill /F /IM git.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Remove lock files
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"

:: Stage ONLY the two changed files
echo Staging changed files...
git add backend/routes/supplier-quotations.js
git add frontend/index.html

:: Show what is staged
echo.
echo --- Staged changes ---
git diff --cached --stat
echo ---------------------
echo.

:: Commit
git commit -m "fix: sort supplier quotations descending by quote number"
echo Commit result: %ERRORLEVEL%

:: Push
echo.
echo Pushing to origin/main...
git push --set-upstream origin main
echo Push result: %ERRORLEVEL%

echo.
echo === Done! Railway will redeploy in ~1 min ===
echo.
git log --oneline -3
echo.
pause
