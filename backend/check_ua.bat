@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs'),path=require('path');const fe='../frontend';fs.readdirSync(fe).forEach(f=>console.log(f));console.log('ua.js exists:',fs.existsSync(path.join(fe,'ua.js')));"
