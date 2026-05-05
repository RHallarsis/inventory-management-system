@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');if(!fs.existsSync('_check2.js')){console.log('_check2.js NOT FOUND');process.exit(1);}const js=fs.readFileSync('_check2.js','utf8');const lines=js.split('\n');console.log('_check2.js lines:',lines.length);console.log('Last 5 lines:');lines.slice(-5).forEach((l,i)=>console.log((lines.length-4+i)+': '+l.substring(0,100)));console.log('Has module.exports:',js.includes('module.exports'));console.log('Final char code:',js.charCodeAt(js.length-1));"
