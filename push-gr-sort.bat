@echo off
cd /d "E:\Projects\Inventory Management Web App"
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add frontend/index.html
git diff --cached --stat
git commit -m "fix: sort goods received table descending by GR sequence number"
git push --set-upstream origin main
echo.
echo Done!
timeout /t 8
