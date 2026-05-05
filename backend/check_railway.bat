@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');console.log('=== All localhost:3000 refs ===');let count=0;lines.forEach((l,i)=>{if(l.includes('localhost:3000')&&!l.startsWith('//')){{count++;console.log((i+1)+': '+l.trim());}}});console.log('Total:',count);"
echo.
echo === Database seed users ===
node -e "const fs=require('fs');const db=fs.readFileSync('./database.js','utf8');const lines=db.split('\n');let inSeed=false;lines.forEach((l,i)=>{if(l.includes('INSERT INTO users')||l.includes('seed')&&l.includes('user'))inSeed=true;if(inSeed){console.log((i+1)+': '+l);if(l.includes(';')||l.includes(')')){inSeed=false;}}});"
