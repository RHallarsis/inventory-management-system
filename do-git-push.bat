@echo off
cd /d "E:\Projects\Inventory Management Web App"
git add frontend/index.html backend/routes/inventory.js backend/database.js
git commit -m "feat: pullout receipts - rename Transferred By to Pulled Out By, add Prepared By, Returned By, Witnessed By columns"
git push origin main
echo.
echo Done. Check Railway for deployment.
