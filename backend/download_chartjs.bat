@echo off
cd /d "E:\Projects\Inventory Management Web App\frontend"
curl -L -o chart.min.js "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
echo Downloaded: %errorlevel%
dir chart.min.js
