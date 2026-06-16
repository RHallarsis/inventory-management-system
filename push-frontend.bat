@echo off
cd /d "E:\Projects\Inventory Management Web App"

:: Remove lock files
if exist ".git\index.lock"      del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"       del /f /q ".git\HEAD.lock"
if exist ".git\MERGE_HEAD.lock" del /f /q ".git\MERGE_HEAD.lock"
timeout /t 2 /nobreak > nul

:: Configure git
git config core.editor "cmd /c exit 0"
git config pull.rebase false

:: Stage the files
echo Staging files...
git add frontend/index.html
git add backend/routes/inventory.js

:: Commit if anything changed
git diff --cached --quiet
if errorlevel 1 (
    echo Committing ...
    git commit -m "fix: switch session to sessionStorage so login page shows on new visits"
) else (
    echo Nothing new to commit.
)

:: Sync and push
echo Pulling ...
git pull --no-edit origin main
echo Pushing ...
git push --set-upstream origin main

echo.
echo Done! Railway will redeploy in ~1 minute.
timeout /t 8
