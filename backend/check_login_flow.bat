@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');console.log('=== doLogin function ===');let found=false;for(let i=0;i<lines.length;i++){if(lines[i].includes('async function doLogin')||lines[i].includes('function doLogin'))found=true;if(found){console.log((i+1)+': '+lines[i]);if(i>5&&lines[i].trim()==='}')break;}}"
