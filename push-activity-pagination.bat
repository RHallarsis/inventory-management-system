@echo off
cd /d "E:\Projects\Inventory Management Web App"

:: Clean locks
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"
if exist ".git\index"      del /f /q ".git\index"
git reset > nul 2>&1

:: Stage both changed files
git add backend/routes/activity-logs.js
git add frontend/index.html
echo Staged files:
git diff --cached --stat

:: Commit
git commit -m "feat: activity logs pagination (50/page) + 30-day auto-purge"
echo Commit result: %ERRORLEVEL%

:: Pull then push
git pull --no-edit origin main
git push --set-upstream origin main
echo Push result: %ERRORLEVEL%

echo.
echo Done! Railway will redeploy in ~1 minute.
timeout /t 10
