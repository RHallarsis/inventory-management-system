@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');console.log('Total lines:',lines.length);console.log('Last 5 lines:');lines.slice(-5).forEach((l,i)=>console.log((lines.length-4+i)+': '+l));console.log('All script tags:');lines.forEach((l,i)=>{if(/<script[\s>]/i.test(l)||l.includes('</script>'))console.log((i+1)+': '+l.trim())});"
