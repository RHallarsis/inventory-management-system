@echo off
cd /d "E:\Projects\Inventory Management Web App"
git add backend/routes/line.js backend/utils/lineService.js backend/routes/calendar.js
git commit -m "feat: add time to LINE notifications"
git push origin main
echo Done.
