@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');['renderMMChart','renderDashTable','function fmt'].forEach(fn=>{const i=lines.findIndex(l=>l.includes(fn));console.log('--- '+fn+' at line '+(i+1)+' ---');if(i>=0)for(let j=i;j<Math.min(i+40,lines.length);j++){console.log((j+1)+': '+lines[j]);if(j>i&&lines[j].trim()==='}')break;}})"
