@echo off
cd /d "E:\Projects\Inventory Management Web App"
del .git\index.lock 2>nul
del .git\HEAD.lock 2>nul
git add frontend/index.html
git commit -m "Add pagination to Activity Logs (50 entries/page)"
git push origin main
echo.
echo Done! Railway will auto-redeploy.
pause
