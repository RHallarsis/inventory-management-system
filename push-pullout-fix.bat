@echo off
E:
cd "E:\Projects\Inventory Management Web App"
"C:\Program Files\Git\cmd\git.exe" add backend/routes/inventory.js frontend/index.html
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: sort pullout receipts by sequence number descending"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo Done! Railway will redeploy in ~1 minute.
pause
