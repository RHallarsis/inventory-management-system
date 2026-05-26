@echo off
cd /d "E:\Projects\Inventory Management Web App"
echo Removing any stale git lock...
if exist ".git\index.lock" del /f ".git\index.lock"
echo.
echo Staging fixed files...
"C:\Program Files\Git\bin\git.exe" add backend/routes/inventory.js backend/server.js
echo.
echo Committing...
"C:\Program Files\Git\bin\git.exe" commit -m "fix: repair truncated inventory.js and server.js

- inventory.js was cut off in DELETE /machine-monitoring/:id route
- server.js was missing IIFE closing block
- Both caused inventory route to fail on Railway"
echo.
echo Pushing to Railway...
"C:\Program Files\Git\bin\git.exe" push origin main
echo.
echo Done! Railway will auto-deploy in ~60 seconds.
pause
