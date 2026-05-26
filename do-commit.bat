@echo off
cd /d "E:\Projects\Inventory Management Web App"
"C:\Program Files\Git\bin\git.exe" add frontend/index.html
"C:\Program Files\Git\bin\git.exe" commit -m "feat: compact task items with description clamp and show more toggle"
"C:\Program Files\Git\bin\git.exe" push origin main
