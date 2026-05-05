@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const lines=fs.readFileSync('./database.js','utf8').split('\n');for(let i=448;i<=465;i++)console.log((i+1)+': '+lines[i]);"
