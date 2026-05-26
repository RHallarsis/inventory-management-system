@echo off
E:
cd "E:\Projects\Inventory Management Web App"
taskkill /F /IM git.exe >nul 2>&1
timeout /t 1 /nobreak >nul
if exist .git\index.lock del /f .git\index.lock
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add frontend/index.html
git commit -m "fix: restore truncated end of index.html (missing boot block and closing tags)"
git push origin main
echo.
echo === Last 3 commits ===
git log --oneline -3
