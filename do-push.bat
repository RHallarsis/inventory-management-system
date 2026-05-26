@echo off
E:
cd E:\Projects\Inventory Management Web App
"C:\Program Files\Git\cmd\git.exe" add frontend/index.html
"C:\Program Files\Git\cmd\git.exe" commit -m "deploy staff access updates"
"C:\Program Files\Git\cmd\git.exe" push origin main
pause
