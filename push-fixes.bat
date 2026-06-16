@echo off
cd /d "E:\Projects\Inventory Management Web App"

:: Remove ALL lock files
if exist ".git\index.lock"      del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"       del /f /q ".git\HEAD.lock"
if exist ".git\MERGE_HEAD.lock" del /f /q ".git\MERGE_HEAD.lock"

:: Wait a moment to ensure locks are cleared
timeout /t 2 /nobreak > nul

:: Configure git
git config core.editor "cmd /c exit 0"
git config pull.rebase false

:: Stage only the specific fixed files
echo Staging files...
git add backend/server.js backend/routes/auth.js backend/routes/inventory.js CLAUDE.md

:: Check if there's anything to commit
git diff --cached --quiet
if errorlevel 1 (
    echo Committing fixes...
    git commit -m "fix: remove session blocking, fix inventory.js truncation, force redeploy"
) else (
    echo Nothing new to commit - already up to date.
)

:: Pull then push
echo Pulling...
git pull --no-edit origin main
echo Pushing...
git push --set-upstream origin main

echo.
echo Done! Check Railway in ~1 minute.
timeout /t 8
