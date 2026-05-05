@echo off
cd /d "E:\Projects\Inventory Management Web App\backend"
node -e "const fs=require('fs');const html=fs.readFileSync('../frontend/index.html','utf8');const lines=html.split('\n');['mm-bar-chart','mm-legend','kpi-total','kpi-value','kpi-low','kpi-out','dash-body','dash-search','dash-meta'].forEach(id=>{const i=lines.findIndex(l=>l.includes('id=\"'+id+'\"'));console.log((i>=0?'FOUND':'MISSING')+' id='+id+(i>=0?' at line '+(i+1):''));});"
