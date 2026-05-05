const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');

// ── Fix 1: Restructure initDashboard ────────────────────────────────────────
// Old: rendering inside the same try-catch as fetch → render errors mislabelled
// New: fetch in try-catch, render OUTSIDE with their own guards
const oldDash = `async function initDashboard(){
  try{
    const [stats,inv,parts,mm]=await Promise.all([
      fetch(API+'/stats').then(r=>r.json()),
      fetch(API+'/inventory').then(r=>r.json()),
      fetch(API+'/spare-parts').then(r=>r.json()),
      fetch(API+'/machine-monitoring').then(r=>r.json())
    ]);
    invData=inv;
    smData=parts;
    mmData=mm;
    document.getElementById('kpi-total').textContent=stats.totalProducts||0;
    document.getElementById('kpi-value').textContent=fmt(stats.totalValue);
    document.getElementById('kpi-low').textContent=stats.lowStockItems||0;
    document.getElementById('kpi-out').textContent=stats.outOfStock||0;
    renderDashTable();
    renderMMChart(mm);
  }catch(e){gToast('Could not connect to backend','error');}
}`;

const newDash = `async function initDashboard(){
  try{
    const [stats,inv,parts,mm]=await Promise.all([
      fetch(API+'/stats').then(r=>r.json()),
      fetch(API+'/inventory').then(r=>r.json()),
      fetch(API+'/spare-parts').then(r=>r.json()),
      fetch(API+'/machine-monitoring').then(r=>r.json())
    ]);
    invData=inv;
    smData=parts;
    mmData=mm;
    document.getElementById('kpi-total').textContent=stats.totalProducts||0;
    document.getElementById('kpi-value').textContent=fmt(stats.totalValue);
    document.getElementById('kpi-low').textContent=stats.lowStockItems||0;
    document.getElementById('kpi-out').textContent=stats.outOfStock||0;
  }catch(e){
    console.error('[initDashboard] Network error:', e);
    gToast('Could not connect to backend','error');
    return;
  }
  // Render outside try-catch: a render crash won't be mislabelled as network error
  try{ renderDashTable(); }catch(e){ console.error('[renderDashTable]',e); }
  try{ renderMMChart(mmData); }catch(e){ console.error('[renderMMChart]',e); }
}`;

if (!html.includes(oldDash)) {
  console.log('ERROR: initDashboard old text not found exactly — checking for partial match...');
  // Try to find it with flexible whitespace
  const idx = html.indexOf('async function initDashboard(){');
  console.log('initDashboard found at index:', idx);
  process.exit(1);
}
html = html.replace(oldDash, newDash);
console.log('✓ initDashboard restructured');

// ── Fix 2: Add guards to renderMMChart ──────────────────────────────────────
const oldChart = `  if(barChart)barChart.destroy();
  const ctx=document.getElementById('mm-bar-chart').getContext('2d');`;

const newChart = `  const _canvas=document.getElementById('mm-bar-chart');
  if(!_canvas||typeof Chart==='undefined'){console.warn('[renderMMChart] Chart.js not ready or canvas missing');return;}
  if(barChart)barChart.destroy();
  const ctx=_canvas.getContext('2d');`;

if (!html.includes(oldChart)) {
  console.log('ERROR: renderMMChart canvas line not found exactly');
  process.exit(1);
}
html = html.replace(oldChart, newChart);
console.log('✓ renderMMChart guards added');

fs.writeFileSync(path, html, 'utf8');

// Verify
const lines = html.split('\n');
const dashIdx = lines.findIndex(l => l.includes('async function initDashboard'));
console.log('\nVerification — initDashboard (lines ' + (dashIdx+1) + '-' + (dashIdx+20) + '):');
for (let i = dashIdx; i < Math.min(dashIdx + 25, lines.length); i++) {
  console.log((i+1) + ': ' + lines[i]);
}
