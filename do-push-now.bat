@echo off
cd /d "E:\Projects\Inventory Management Web App"
"C:\Program Files\Git\cmd\git.exe" add frontend/index.html
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: make supplier email preview modal fully mobile responsive"
"C:\Program Files\Git\cmd\git.exe" push origin main > push-result.txt 2>&1
echo exit_code=%errorlevel% >> push-result.txt
