@echo off
E:
cd "E:\Projects\Inventory Management Web App"

echo Killing any running git processes...
taskkill /F /IM git.exe >nul 2>&1
taskkill /F /IM git-remote-https.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo Removing lock file...
if exist .git\index.lock del /f .git\index.lock
if exist .git\COMMIT_EDITMSG.lock del /f .git\COMMIT_EDITMSG.lock

echo Checking lock...
if exist .git\index.lock (
    echo LOCK STILL EXISTS - trying attrib
    attrib -r .git\index.lock
    del /f .git\index.lock
) else (
    echo Lock cleared.
)

echo Committing...
git commit -m "fix: repair truncated inventory.js and server.js" >> git-out.txt 2>&1
echo Pushing...
git push origin main >> git-out.txt 2>&1

echo === RESULT === >> git-out.txt
git log --oneline -3 >> git-out.txt 2>&1

echo Done - check git-out.txt
