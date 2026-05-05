@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');lines.forEach((l,i)=>{if(l.includes('connect to backend')||l.includes('Backend offline'))console.log((i+1)+': '+l.trim())});"
