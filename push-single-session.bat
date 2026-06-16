@echo off
cd /d "E:\Projects\Inventory Management Web App"

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"
if exist ".git\index"      del /f /q ".git\index"
git reset > nul 2>&1

git add backend/routes/auth.js
git add backend/database.js
git add frontend/index.html
echo Staged files:
git diff --cached --stat

git commit -m "feat: single-session enforcement — block duplicate device login"
echo Commit result: %ERRORLEVEL%

git pull --no-edit origin main
git push --set-upstream origin main
echo Push result: %ERRORLEVEL%

echo.
echo Done! Railway will redeploy in ~1 minute.
timeout /t 10
