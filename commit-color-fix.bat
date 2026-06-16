@echo off
cd /d "E:\Projects\Inventory Management Web App"
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
git config core.editor "cmd /c exit 0"
git add frontend/index.html
git commit -m "style: DR transfer no - remove blue color to match other sections"
git push --set-upstream origin main
echo Done!
timeout /t 5
