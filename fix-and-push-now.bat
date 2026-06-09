@echo off
cd /d "E:\Projects\Inventory Management Web App"
echo Clearing git locks...
del /f ".git\index.lock" 2>nul
del /f ".git\HEAD.lock" 2>nul
echo Committing changes...
git add frontend/index.html
git commit -m "Hide topbar title bar on desktop"
echo Pushing to GitHub...
git push origin main
echo.
echo Done! Railway will auto-deploy in ~1 minute.
pause
