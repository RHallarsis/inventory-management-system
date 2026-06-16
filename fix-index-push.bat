@echo off
cd /d "E:\Projects\Inventory Management Web App"

echo Fixing corrupt git index...
if exist ".git\index" del /f /q ".git\index"
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo Rebuilding index...
git reset

echo Staging all changes...
git add -A

echo Committing...
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "fix: audit log - unique IDs and col variable fix"
) else (
    echo Nothing to commit.
)

echo Pulling...
git pull --no-edit origin main

echo Pushing...
git push --set-upstream origin main

echo.
echo Done!
timeout /t 8
