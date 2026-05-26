@echo off
cd /d "E:\Projects\Inventory Management Web App"
git add backend/services/outlookDraftService.js backend/routes/inventory.js
git commit -m "debug: log CC/BCC values in email route and service"
git push origin main
echo DONE > push-cc-bcc-result.txt
