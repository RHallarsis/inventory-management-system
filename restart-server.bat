@echo off
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
E:
cd "E:\Projects\Inventory Management Web App\backend"
node server.js
