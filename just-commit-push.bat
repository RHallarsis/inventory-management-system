@echo off
cd /d "E:\Projects\Inventory Management Web App"

:: Clean the index first
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\index" del /f /q ".git\index"
git reset > nul 2>&1

:: Stage the changed file
echo Staging frontend/index.html...
git add frontend/index.html
echo git add result: %ERRORLEVEL%

:: Check what's staged
git diff --cached --stat

:: Commit
git commit -m "fix: audit log unique IDs and col variable fix"
echo git commit result: %ERRORLEVEL%

:: Push
git push --set-upstream origin main
echo git push result: %ERRORLEVEL%

echo.
echo All done.
timeout /t 10
