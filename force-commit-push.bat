@echo off
E:
cd "E:\Projects\Inventory Management Web App"

echo Killing git and editor processes...
taskkill /F /IM git.exe >nul 2>&1
taskkill /F /IM git-remote-https.exe >nul 2>&1
taskkill /F /IM git-credential-manager.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Removing ALL lock files...
del /f .git\index.lock >nul 2>&1
del /f .git\HEAD.lock >nul 2>&1
del /f .git\config.lock >nul 2>&1
del /f .git\packed-refs.lock >nul 2>&1

echo Lock status:
if exist .git\index.lock (echo index.lock EXISTS) else (echo index.lock: cleared)
if exist .git\HEAD.lock (echo HEAD.lock EXISTS) else (echo HEAD.lock: cleared)

echo.
echo Committing and pushing immediately...
git commit -m "fix: repair truncated inventory.js and server.js"
git push origin main

echo.
echo Last 3 commits:
git log --oneline -3
pause
