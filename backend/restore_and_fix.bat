@echo off
cd /d "E:\Projects\Inventory Management Web App"

echo Restoring index.html from git HEAD...
git checkout HEAD -- frontend/index.html
echo Done. Lines now:
node -e "const fs=require('fs');const l=fs.readFileSync('./frontend/index.html','utf8').split('\n');console.log(l.length+' lines');const api=l.find(x=>x.includes('const API='));console.log('API line:',api?api.trim():'NOT FOUND');"
