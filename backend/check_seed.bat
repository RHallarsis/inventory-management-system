@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const db=fs.readFileSync('./database.js','utf8');const lines=db.split('\n');lines.forEach((l,i)=>{if(l.includes('INSERT INTO users'))for(let j=i;j<i+5;j++)console.log((j+1)+': '+lines[j]);});"
