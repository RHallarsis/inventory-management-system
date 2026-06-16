@echo off
cd /d "E:\Projects\Inventory Management Web App"

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"
if exist ".git\index"      del /f /q ".git\index"
git reset > nul 2>&1

git add backend/routes/auth.js
git add frontend/index.html
git diff --cached --stat

git commit -m "feat: 10min session timeout, remove force-login, clear session on tab close"
echo Commit: %ERRORLEVEL%

git pull --no-edit origin main
git push --set-upstream origin main
echo Push: %ERRORLEVEL%

echo.
echo Done!
timeout /t 8
