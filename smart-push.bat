@echo off
cd /d "E:\Projects\Inventory Management Web App"

:: ── 1. Remove stale lock files and rebuild index ─────────────────────────────
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\MERGE_HEAD.lock" del /f /q ".git\MERGE_HEAD.lock"
if exist ".git\index" del /f /q ".git\index"
git reset > nul 2>&1

:: ── 2. Configure git to never open an editor ─────────────────────────────────
git config core.editor "cmd /c exit 0"
git config pull.rebase false

:: ── 3. If a merge is already in progress, complete it ────────────────────────
if exist ".git\MERGE_HEAD" (
    echo Completing existing merge...
    git commit --no-edit
)

:: ── 4. Stage and commit any pending changes ──────────────────────────────────
git add -A
git diff --cached --quiet
if errorlevel 1 (
    echo Committing changes...
    git commit -m "update"
) else (
    echo No new changes to commit.
)

:: ── 5. Pull remote changes (no editor, auto-merge) ───────────────────────────
echo Pulling from origin/main...
git pull --no-edit origin main

:: ── 6. Push ──────────────────────────────────────────────────────────────────
echo Pushing to origin/main...
git push --set-upstream origin main

echo.
echo Done! Railway will redeploy shortly.
timeout /t 5
