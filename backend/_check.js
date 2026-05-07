
const API='http://localhost:3000/api';
let currentUser=null;
let invData=[],catData=[],smData=[],irData=[],mmData=[],poData=[],supData=[],grData=[],stData=[],tqData=[],mpData=[],saData=[],wbData=[],lpData=[];
let invEditId=null,invDeleteId=null,catEditId=null,catDeleteId=null;
let smEditId=null,smDeleteId=null,mmEditId=null,mmDeleteId=null,mmAreaFilter='';
let poEditId=null,poDeleteId=null,supEditId=null,supDeleteId=null;
let grEditId=null,grDeleteId=null,stEditId=null,stDeleteId=null;
let tqEditId=null,tqDeleteId=null,mpEditId=null,mpDeleteId=null;
let saEditId=null,saDeleteId=null,wbEditId=null,wbDeleteId=null;
let barChart=null,donutChart=null;
let acYear=new Date().getFullYear(),acMonth=new Date().getMonth(),acSelectedDate=null,acEvents={};
let acTasksData=[],acEditId=null,acDeleteId=null,acPickedColor='#6366f1',acCategoryFilter='';

// ── UTILS ────────────────────────────────────────────────────
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmt(n){return '₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2});}
function badge(st){const k=(st||'').toLowerCase().replace(/\s+/g,'');return `<span class="badge-${k}">${esc(st)||'—'}</span>`;}
function fileLink(r){return r&&r.file_name?`<a class="file-link" href="http://localhost:3000${esc(r.file_path)}" target="_blank">📎 ${esc(r.file_name.replace(/^\d+[-_]/,''))}</a>`:'<span style="color:var(--text-2);font-size:11px">—</span>';}
function ini(name){return (name||'?').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function avatarColor(s){const colors=['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#3b82f6'];let h=0;for(let c of s||'')h=(h<<5)-h+c.charCodeAt(0);return colors[Math.abs(h)%colors.length];}
function today(){return new Date().toISOString().slice(0,10);}

// ── TOAST ────────────────────────────────────────────────────
function gToast(msg,type='success'){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className=`toast ${type}`;t.textContent=msg;c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400);},3000);
}

// ── AUTH ─────────────────────────────────────────────────────
async function doLogin(){
  const id=document.getElementById('l-user').value.trim();
  const pw=document.getElementById('l-pass').value;
  document.getElementById('login-err').textContent='';
  if(!id||!pw){document.getElementById('login-err').textContent='Please enter username and password.';return;}
  try{
    const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:id,password:pw})});
    const d=await r.json();
    if(!r.ok){document.getElementById('login-err').textContent=d.error||'Login failed.';return;}
    currentUser=d.user;
    document.getElementById('login-overlay').style.display='none';
    document.getElementById('user-name').textContent=currentUser.name;
    document.getElementById('user-role').textContent=currentUser.role;
    document.getElementById('user-avatar').textContent=ini(currentUser.name);
    // Apply role-based UI restrictions (Staff = view-only, Admin = full access)
    applyRoleAccess(currentUser.role);
    // Settings page data is only relevant for Admin users
    if(currentUser.role==='Admin'){
      loadLineConfig();loadUsers();
      document.getElementById('set-name').value=currentUser.name||'';
      document.getElementById('set-email').value=currentUser.email||'';
      document.getElementById('set-role').value=currentUser.role||'';
    }
    initApp();
  }catch(e){document.getElementById('login-err').textContent='Cannot connect to server.';}
}
function doLogout(){
  currentUser=null;
  applyRoleAccess(null); // reset all role restrictions
  document.getElementById('login-overlay').style.display='flex';
  document.getElementById('l-pass').value='';
  document.getElementById('login-err').textContent='';
}

// ── ROLE-BASED ACCESS CONTROL ────────────────────────────────
// Pages that Staff users may NOT visit
const STAFF_BLOCKED_PAGES = [
  'purchaseorders','suppliers','goodsreceived','stocktransfers',
  'inventoryreport','purchasereport','logistics','settings'
];

/**
 * Apply (or reset) role-based UI restrictions.
 * Call after login (with the user's role) and after logout (with null).
 */
function applyRoleAccess(role) {
  const isStaff = role === 'Staff';

  // ── body class toggles the CSS visibility rules ──
  document.body.classList.toggle('staff-mode', isStaff);

  // ── topbar badge ──
  const badge = document.getElementById('staff-viewonly-badge');
  if (badge) badge.classList.toggle('visible', isStaff);

  // ── sidebar nav items ──
  STAFF_BLOCKED_PAGES.forEach(page => {
    const el = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (el) el.style.display = isStaff ? 'none' : '';
  });

  // ── "Reports" nav label — hide entirely for Staff ──
  document.querySelectorAll('.nav-label').forEach(label => {
    if (label.textContent.trim() === 'Reports') {
      label.style.display = isStaff ? 'none' : '';
    }
  });

  // ── "System" nav label — keep visible (Alerts + Calendar remain accessible) ──
  // (no change needed here)
}

// ── PAGE SWITCHING ───────────────────────────────────────────
const PAGE_TITLES={dashboard:'Dashboard',categories:'Categories',stockmonitoring:'Stock Monitoring',localpurchase:'Local Purchase Monitoring',machinemonitoring:'Machine Monitoring',purchaseorders:'Purchase Orders',suppliers:'Suppliers',goodsreceived:'Goods Received',stocktransfers:'Delivery Receipts',inventoryreport:'Inventory Report',purchasereport:'Purchase Report',alerts:'Alerts',logistics:'Logistics',activitycalendar:'Activity Calendar',settings:'Settings'};
function showPage(page){
  // ── Role guard: Staff cannot visit admin-only pages ──────────
  if(currentUser && currentUser.role==='Staff' && STAFF_BLOCKED_PAGES.includes(page)){
    document.querySelectorAll('.page-section').forEach(el=>el.classList.remove('active'));
    document.getElementById('page-staff-blocked').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    document.getElementById('topbar-title').textContent='Access Restricted';
    return;
  }
  document.querySelectorAll('.page-section').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const nav=document.querySelector(`.nav-item[data-page="${page}"]`);
  if(nav)nav.classList.add('active');
  document.getElementById('topbar-title').textContent=PAGE_TITLES[page]||page;
  if(page==='dashboard')initDashboard();
  else if(page==='categories')loadCat();
  else if(page==='stockmonitoring')loadSM();
  else if(page==='machinemonitoring')loadMM();
  else if(page==='purchaseorders')loadPO();
  else if(page==='suppliers')loadSup();
  else if(page==='goodsreceived')loadGR();
  else if(page==='stocktransfers')loadST();
  else if(page==='inventoryreport')loadIR();
  else if(page==='purchasereport')loadPR();
  else if(page==='alerts')loadAlerts();
  else if(page==='logistics')loadLogistics();
  else if(page==='localpurchase')loadLP();
  else if(page==='activitycalendar'){acYear=new Date().getFullYear();acMonth=new Date().getMonth();acSelectedDate=null;renderACCalendar();loadACEvents();}
}

// ── INIT ─────────────────────────────────────────────────────
function initApp(){
  const d=new Date();
  document.getElementById('topbar-date').textContent=d.toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  initDashboard();
  loadAlertBadge();
}
async function initDashboard(){
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
}
function renderDashTable(){
  const q=(document.getElementById('dash-search').value||'').toLowerCase();
  const src=smData;
  const rows=q?src.filter(r=>
    (r.name||'').toLowerCase().includes(q)||
    (r.part_no||'').toLowerCase().includes(q)||
    (r.machine||'').toLowerCase().includes(q)
  ):src;
  document.getElementById('dash-meta').textContent=`Showing ${rows.length} of ${src.length}`;
  document.getElementById('dash-body').innerHTML=rows.map((r,i)=>{
    const needsOrder=(r.on_hand||0)<=(r.safety_stock||0);
    const orderBadge=needsOrder
      ?`<span class="badge-outofstock" style="font-size:11px;padding:3px 8px">Order Now</span>`
      :`<span class="badge-instock" style="font-size:11px;padding:3px 8px">OK</span>`;
    return`<tr>
      <td>${i+1}</td>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${esc(r.part_no)}</td>
      <td>${esc(r.machine)||'—'}</td>
      <td>${r.on_hand??0}</td>
      <td>${r.on_order??0}</td>
      <td>${orderBadge}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="7"><div class="no-results">No spare parts found.</div></td></tr>`;
}
function renderMMChart(mm){
  // ── Machine type columns ─────────────────────────────────
  const TYPES=[
    {key:'ez',   label:'EZ',    color:'#6366f1'},
    {key:'br',   label:'BR',    color:'#10b981'},
    {key:'ez2',  label:'EZ2',   color:'#f59e0b'},
    {key:'ezl',  label:'EZL',   color:'#8b5cf6'},
    {key:'lb',   label:'LB',    color:'#ec4899'},
    {key:'j_ark',label:'J-ARK', color:'#3b82f6'}
  ];

  // ── Define the 5 display groups ──────────────────────────
  const GROUPS=[
    {label:'Manila Area\nGroup 1', match:r=>r.area==='Manila Area'&&r.group_name==='Group 1'},
    {label:'Manila Area\nGroup 2', match:r=>r.area==='Manila Area'&&r.group_name==='Group 2'},
    {label:'Manila Area\nGroup 3', match:r=>r.area==='Manila Area'&&r.group_name==='Group 3'},
    {label:'Pampanga Area',        match:r=>r.area==='Pampanga Area'},
    {label:'Cebu Area',            match:r=>r.area==='Cebu Area'}
  ];

  // ── Aggregate: sum each machine type per group ───────────
  const groupTotals=GROUPS.map(g=>{
    const rows=mm.filter(g.match);
    const totals={};
    TYPES.forEach(t=>{ totals[t.key]=rows.reduce((s,r)=>s+(+r[t.key]||0),0); });
    return totals;
  });

  const datasets=TYPES.map(t=>({
    label:t.label,
    data:GROUPS.map((_,i)=>groupTotals[i][t.key]),
    backgroundColor:t.color,
    borderRadius:5,
    borderSkipped:false,
    barPercentage:0.75,
    categoryPercentage:0.8
  }));

  // ── Inline colour legend ─────────────────────────────────
  const legend=document.getElementById('mm-legend');
  if(legend){
    legend.innerHTML=TYPES.map(t=>
      `<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2)">
         <span style="width:10px;height:10px;border-radius:2px;background:${t.color};display:inline-block"></span>${t.label}
       </span>`
    ).join('');
  }

  if(barChart)barChart.destroy();
  const ctx=document.getElementById('mm-bar-chart').getContext('2d');
  barChart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:GROUPS.map(g=>g.label.split('\n')),   // multi-line x-axis labels
      datasets
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        tooltip:{
          mode:'index',
          intersect:false,
          callbacks:{
            title:items=>GROUPS[items[0].dataIndex].label.replace('\n',' — ')
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{font:{size:11},color:'var(--text-2)'}
        },
        y:{
          beginAtZero:true,
          ticks:{stepSize:10},
          title:{display:true,text:'Total Units',font:{size:11},color:'var(--text-2)'},
          grid:{color:'rgba(0,0,0,.05)'}
        }
      }
    }
  });
}

// ── INVENTORY ITEM CRUD (Dashboard) ─────────────────────────
function openInvModal(id=null){
  invEditId=id;
  const r=id?invData.find(x=>x.id===id):null;
  document.getElementById('inv-modal-title').textContent=id?'Edit Item':'Add Item';
  document.getElementById('inv-f-code').value=r?r.product_code:'';
  document.getElementById('inv-f-cat').value=r?r.category:'';
  document.getElementById('inv-f-name').value=r?r.name:'';
  document.getElementById('inv-f-qty').value=r!=null?r.quantity:'';
  document.getElementById('inv-f-price').value=r!=null?r.unit_price:'';
  document.getElementById('inv-modal').classList.add('open');
}
function closeInvModal(){document.getElementById('inv-modal').classList.remove('open');}
async function saveInv(){
  const product_code=document.getElementById('inv-f-code').value.trim();
  const name=document.getElementById('inv-f-name').value.trim();
  const category=document.getElementById('inv-f-cat').value.trim();
  const quantity=document.getElementById('inv-f-qty').value;
  const unit_price=document.getElementById('inv-f-price').value;
  if(!product_code||!name||!category||quantity===''||unit_price===''){gToast('All fields are required.','error');return;}
  try{
    const url=invEditId?API+'/inventory/'+invEditId:API+'/inventory';
    const res=await fetch(url,{method:invEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_code,name,category,quantity:+quantity,unit_price:+unit_price})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}
    gToast(invEditId?'Item updated!':'Item added!');
    closeInvModal();
    initDashboard();
  }catch(err){gToast(err.message,'error');}
}
function openInvDelModal(id,name){invDeleteId=id;document.getElementById('inv-del-name').textContent=name;document.getElementById('inv-del-modal').classList.add('open');}
async function confirmDeleteInv(){
  try{
    const res=await fetch(API+'/inventory/'+invDeleteId,{method:'DELETE'});
    if(!res.ok&&res.status!==204){const e=await res.json();throw new Error(e.error||'Delete failed');}
    gToast('Item deleted.');
    document.getElementById('inv-del-modal').classList.remove('open');
    initDashboard();
  }catch(err){gToast(err.message,'error');}
}

// ── CATEGORIES ──────────────────────────────────────────────
async function loadCat(){
  try{const r=await fetch(API+'/categories');catData=await r.json();renderCat();}
  catch{document.getElementById('cat-body').innerHTML='<tr><td colspan="5"><div class="no-results">Backend offline.</div></td></tr>';}
}
function renderCat(){
  const q=(document.getElementById('cat-search').value||'').toLowerCase();
  const rows=q?catData.filter(r=>(r.name||'').toLowerCase().includes(q)):catData;
  document.getElementById('cat-meta').textContent=`Showing ${rows.length} of ${catData.length}`;
  document.getElementById('cat-body').innerHTML=rows.map((r,i)=>`<tr>
    <td>${i+1}</td><td><strong>${r.name}</strong></td><td>${r.specification||'—'}</td><td>${r.quantity||0}</td>
    <td><button class="page-act-btn btn-edit" onclick="openCatModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openCatDelModal(${r.id},'${(r.name||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="no-results">No categories.</div></td></tr>';
}
function openCatModal(id=null){catEditId=id;const r=id?catData.find(x=>x.id===id):null;document.getElementById('cat-modal-title').textContent=id?'Edit Category':'Add Category';document.getElementById('cat-f-name').value=r?r.name:'';document.getElementById('cat-f-spec').value=r?r.specification:'';document.getElementById('cat-modal').classList.add('open');}
function closeCatModal(){document.getElementById('cat-modal').classList.remove('open');}
async function saveCat(){
  const name=document.getElementById('cat-f-name').value.trim();const spec=document.getElementById('cat-f-spec').value.trim();
  if(!name){gToast('Name required.','error');return;}
  try{const url=catEditId?API+'/categories/'+catEditId:API+'/categories';const res=await fetch(url,{method:catEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,specification:spec})});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(catEditId?'Updated!':'Added!');closeCatModal();loadCat();}catch(err){gToast(err.message,'error');}
}
function openCatDelModal(id,name){catDeleteId=id;document.getElementById('cat-del-name').textContent=name;document.getElementById('cat-del-modal').classList.add('open');}
function closeCatDelModal(){document.getElementById('cat-del-modal').classList.remove('open');}
async function confirmDeleteCat(){try{await fetch(API+'/categories/'+catDeleteId,{method:'DELETE'});gToast('Deleted.');closeCatDelModal();loadCat();}catch{gToast('Delete failed','error');}}

// ── STOCK MONITORING ────────────────────────────────────────
async function loadSM(){
  try{const r=await fetch(API+'/spare-parts');smData=await r.json();renderSM();}
  catch{
    document.getElementById('sm-body').innerHTML='<tr><td colspan="11"><div class="no-results">Backend offline.</div></td></tr>';
    ['sm-kpi-instock','sm-kpi-low','sm-kpi-out','sm-kpi-total'].forEach(id=>{document.getElementById(id).textContent='—';});
  }
}
function smCalc(r){
  const mu=+(r.monthly_usage)||0, lt=+(r.lead_time)||0, buf=+(r.buffer)||3, ss=+(r.safety_stock)||1;
  const rp=Math.ceil(mu*(lt+buf+ss));
  const net=(+(r.on_hand)||0)+(+(r.on_order)||0);
  const rq=Math.max(0,rp-net);
  const orderNow=net<rp;
  return {rp,net,rq,orderNow};
}
function renderSM(){
  // Set generated date
  const gd=document.getElementById('sm-gen-date');
  if(gd&&!gd.textContent){const d=new Date();gd.textContent=d.toISOString().split('T')[0];}
  // Compute per-row values for KPIs
  const computed=smData.map(r=>({...r,...smCalc(r)}));
  const orderNowCount=computed.filter(r=>r.orderNow).length;
  const inStock=computed.filter(r=>!r.orderNow&&(r.on_hand||0)>0).length;
  const out=computed.filter(r=>(r.on_hand||0)===0).length;
  const low=computed.filter(r=>(r.on_hand||0)>0&&r.orderNow).length;
  document.getElementById('sm-kpi-instock').textContent=inStock;
  document.getElementById('sm-kpi-low').textContent=low;
  document.getElementById('sm-kpi-out').textContent=out;
  document.getElementById('sm-kpi-total').textContent=orderNowCount;
  // Render table
  const q=(document.getElementById('sm-search').value||'').toLowerCase();
  const rows=q?computed.filter(r=>(r.name||'').toLowerCase().includes(q)||(r.part_no||'').toLowerCase().includes(q)||(r.machine||'').toLowerCase().includes(q)):computed;
  document.getElementById('sm-meta').textContent=`Showing ${rows.length} of ${smData.length}`;
  document.getElementById('sm-body').innerHTML=rows.map((r,i)=>`<tr${r.orderNow?' style="background:rgba(254,226,226,.45)"':''}>
    <td>${i+1}</td>
    <td><strong>${esc(r.name)}</strong></td>
    <td>${esc(r.part_no)}</td>
    <td>${esc(r.machine)||'—'}</td>
    <td>${r.on_hand}</td>
    <td>${r.on_order}</td>
    <td>${r.monthly_usage}</td>
    <td>${r.lead_time}</td>
    <td>${r.buffer}</td>
    <td>${r.safety_stock}</td>
    <td><strong>${r.rp}</strong></td>
    <td>${r.net}</td>
    <td>${r.rq||0}</td>
    <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;${r.orderNow?'background:#fee2e2;color:#991b1b;':'background:#d1fae5;color:#065f46;'}">${r.orderNow?'YES':'NO'}</span></td>
    <td><button class="page-act-btn btn-edit" onclick="openSMModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openSMDelModal(${r.id},'${esc(r.name||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="15"><div class="no-results">No spare parts.</div></td></tr>';
}
function openSMModal(id=null){smEditId=id;const r=id?smData.find(x=>x.id===id):null;document.getElementById('sm-modal-title').textContent=id?'Edit Spare Part':'Add Spare Part';['name','partno','machine','onhand','onorder','usage','lead','buffer','safety'].forEach(k=>{const map={name:r?.name,partno:r?.part_no,machine:r?.machine,onhand:r?.on_hand??0,onorder:r?.on_order??0,usage:r?.monthly_usage??0,lead:r?.lead_time??0,buffer:r?.buffer??3,safety:r?.safety_stock??1};document.getElementById('sm-f-'+k).value=map[k]??'';});document.getElementById('sm-modal').classList.add('open');}
function closeSMModal(){document.getElementById('sm-modal').classList.remove('open');}
async function saveSM(){
  const body={name:document.getElementById('sm-f-name').value.trim(),part_no:document.getElementById('sm-f-partno').value.trim(),machine:document.getElementById('sm-f-machine').value.trim(),on_hand:+document.getElementById('sm-f-onhand').value||0,on_order:+document.getElementById('sm-f-onorder').value||0,monthly_usage:+document.getElementById('sm-f-usage').value||0,lead_time:+document.getElementById('sm-f-lead').value||0,buffer:+document.getElementById('sm-f-buffer').value||3,safety_stock:+document.getElementById('sm-f-safety').value||1};
  if(!body.name||!body.part_no){gToast('Name and Part No required.','error');return;}
  try{const url=smEditId?API+'/spare-parts/'+smEditId:API+'/spare-parts';const res=await fetch(url,{method:smEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(smEditId?'Updated!':'Added!');closeSMModal();loadSM();}catch(err){gToast(err.message,'error');}
}
function openSMDelModal(id,name){smDeleteId=id;document.getElementById('sm-del-name').textContent=name;document.getElementById('sm-del-modal').classList.add('open');}
function closeSMDelModal(){document.getElementById('sm-del-modal').classList.remove('open');}
async function confirmDeleteSM(){try{await fetch(API+'/spare-parts/'+smDeleteId,{method:'DELETE'});gToast('Deleted.');closeSMDelModal();loadSM();}catch{gToast('Delete failed','error');}}

// ── MACHINE MONITORING ──────────────────────────────────────
async function loadMM(){
  try{const r=await fetch(API+'/machine-monitoring');mmData=await r.json();renderMM();}
  catch{document.getElementById('mm-body').innerHTML='<tr><td colspan="9"><div class="no-results">Backend offline.</div></td></tr>';}
}
function filterMM(area,btn){mmAreaFilter=area;document.querySelectorAll('.log-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderMM();}
function renderMM(){
  const rows=mmAreaFilter?mmData.filter(r=>r.area===mmAreaFilter):mmData;
  const areas=['Manila Area','Pampanga Area','Cebu Area'];
  let html='';let totals={ez:0,br:0,ez2:0,ezl:0,lb:0,j_ark:0,total:0};
  const grouped={};rows.forEach(r=>{const a=r.area||'Other';if(!grouped[a])grouped[a]={};const g=r.group_name||a;if(!grouped[a][g])grouped[a][g]=[];grouped[a][g].push(r);});
  (mmAreaFilter?[mmAreaFilter]:areas).forEach(area=>{
    if(!grouped[area])return;
    html+=`<tr class="mm-area-header"><td colspan="9">${area}</td></tr>`;
    Object.keys(grouped[area]).forEach(grp=>{
      if(grp!==area)html+=`<tr class="mm-group-header"><td colspan="9">&nbsp;&nbsp;${grp}</td></tr>`;
      grouped[area][grp].forEach(r=>{
        html+=`<tr><td>&nbsp;&nbsp;${r.site}</td><td>${r.ez||0}</td><td>${r.br||0}</td><td>${r.ez2||0}</td><td>${r.ezl||0}</td><td>${r.lb||0}</td><td>${r.j_ark||0}</td><td><strong>${r.total||0}</strong></td>
        <td><button class="page-act-btn btn-edit" onclick="openMMModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openMMDelModal(${r.id},'${(r.site||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`;
        ['ez','br','ez2','ezl','lb','j_ark','total'].forEach(k=>totals[k]+=(+r[k]||0));
      });
    });
  });
  document.getElementById('mm-body').innerHTML=html||'<tr><td colspan="9"><div class="no-results">No data.</div></td></tr>';
  ['ez','br','ez2','ezl','lb'].forEach(k=>document.getElementById('mm-f-'+k).textContent=totals[k]);
  document.getElementById('mm-f-jark').textContent=totals.j_ark;
  document.getElementById('mm-f-total').textContent=totals.total;
}
function toggleMMGroup(){const a=document.getElementById('mm-f-area').value;document.getElementById('mm-group-row').style.display=a==='Manila Area'?'':'none';}
function openMMModal(id=null){mmEditId=id;const r=id?mmData.find(x=>x.id===id):null;document.getElementById('mm-modal-title').textContent=id?'Edit Site':'Add Site';document.getElementById('mm-f-site').value=r?r.site:'';document.getElementById('mm-f-area').value=r?r.area:'Manila Area';document.getElementById('mm-f-group').value=r?r.group_name:'Group 1';toggleMMGroup();['ez','br','ez2','ezl','lb'].forEach(k=>document.getElementById('mm-f-'+k).value=r?r[k]:0);document.getElementById('mm-f-jark').value=r?r.j_ark:0;document.getElementById('mm-modal').classList.add('open');}
function closeMMModal(){document.getElementById('mm-modal').classList.remove('open');}
async function saveMM(){
  const area=document.getElementById('mm-f-area').value;const body={site:document.getElementById('mm-f-site').value.trim(),area,group_name:area==='Manila Area'?document.getElementById('mm-f-group').value:area,ez:+document.getElementById('mm-f-ez').value||0,br:+document.getElementById('mm-f-br').value||0,ez2:+document.getElementById('mm-f-ez2').value||0,ezl:+document.getElementById('mm-f-ezl').value||0,lb:+document.getElementById('mm-f-lb').value||0,j_ark:+document.getElementById('mm-f-jark').value||0};
  if(!body.site){gToast('Site name required.','error');return;}
  try{const url=mmEditId?API+'/machine-monitoring/'+mmEditId:API+'/machine-monitoring';const res=await fetch(url,{method:mmEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(mmEditId?'Updated!':'Added!');closeMMModal();loadMM();}catch(err){gToast(err.message,'error');}
}
function openMMDelModal(id,name){mmDeleteId=id;document.getElementById('mm-del-name').textContent=name;document.getElementById('mm-del-modal').classList.add('open');}
function closeMMDelModal(){document.getElementById('mm-del-modal').classList.remove('open');}
async function confirmDeleteMM(){try{await fetch(API+'/machine-monitoring/'+mmDeleteId,{method:'DELETE'});gToast('Deleted.');closeMMDelModal();loadMM();}catch{gToast('Delete failed','error');}}

// ── LOCAL PURCHASE MONITORING ────────────────────────────────
let lpEditId=null,lpDeleteId=null;
async function loadLP(){
  try{const r=await fetch(API+'/local-purchases');lpData=await r.json();renderLP();}
  catch{document.getElementById('lp-body').innerHTML='<tr><td colspan="12"><div class="no-results">Backend offline.</div></td></tr>';}
}
function renderLP(){
  const q=(document.getElementById('lp-search').value||'').toLowerCase();
  const ft=document.getElementById('lp-filter').value;
  let rows=lpData.filter(r=>
    (!q||(r.po_number||'').toLowerCase().includes(q)||(r.part_name||'').toLowerCase().includes(q)||(r.supplier||'').toLowerCase().includes(q))&&
    (!ft||r.status===ft)
  );
  // KPIs
  document.getElementById('lp-kpi-total').textContent=lpData.length;
  document.getElementById('lp-kpi-pending').textContent=lpData.filter(r=>r.status==='Pending'||r.status==='Ordered').length;
  document.getElementById('lp-kpi-received').textContent=lpData.filter(r=>r.status==='Received').length;
  const totalCost=lpData.reduce((s,r)=>s+(+(r.total)||0),0);
  document.getElementById('lp-kpi-cost').textContent=fmt(totalCost);
  // Table meta
  document.getElementById('lp-meta').textContent=`Showing ${rows.length} of ${lpData.length}`;
  // Grand total of filtered rows
  const grandTotal=rows.reduce((s,r)=>s+(+(r.total)||0),0);
  document.getElementById('lp-grand-total').textContent=fmt(grandTotal);
  // Rows
  document.getElementById('lp-body').innerHTML=rows.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong>${esc(r.po_number)}</strong></td>
    <td>${esc(r.part_name)||'—'}</td>
    <td>${esc(r.supplier)||'—'}</td>
    <td>${r.qty_ordered}</td>
    <td>${fmt(r.unit_price)}</td>
    <td><strong>${fmt(r.total)}</strong></td>
    <td>${r.order_date||'—'}</td>
    <td>${r.expected_date||'—'}</td>
    <td>${badge(r.status)}</td>
    <td>${esc(r.remarks)||'—'}</td>
    <td>
      <button class="page-act-btn btn-edit" onclick="openLPModal(${r.id})">Edit</button>
      <button class="page-act-btn btn-del" onclick="openLPDelModal(${r.id},'${esc(r.po_number||'').replace(/'/g,"\\'")}')">Del</button>
    </td></tr>`).join('')||'<tr><td colspan="12"><div class="no-results">No local purchases found.</div></td></tr>';
}
function calcLPTotal(){
  const qty=+(document.getElementById('lp-f-qty').value)||0;
  const price=+(document.getElementById('lp-f-uprice').value)||0;
  document.getElementById('lp-f-total').value=(qty*price).toFixed(2);
}
function openLPModal(id=null){
  lpEditId=id;
  const r=id?lpData.find(x=>x.id===id):null;
  document.getElementById('lp-modal-title').textContent=id?'Edit Local Purchase':'Add Local Purchase';
  document.getElementById('lp-f-pono').value=r?r.po_number:'';
  document.getElementById('lp-f-part').value=r?r.part_name:'';
  document.getElementById('lp-f-supplier').value=r?r.supplier:'';
  document.getElementById('lp-f-status').value=r?r.status:'Pending';
  document.getElementById('lp-f-qty').value=r?r.qty_ordered:1;
  document.getElementById('lp-f-uprice').value=r?r.unit_price:0;
  document.getElementById('lp-f-total').value=r?(+(r.total)||0).toFixed(2):'0.00';
  document.getElementById('lp-f-orderdate').value=r?r.order_date:today();
  document.getElementById('lp-f-expdate').value=r?r.expected_date:'';
  document.getElementById('lp-f-remarks').value=r?r.remarks:'';
  document.getElementById('lp-modal').classList.add('open');
}
function closeLPModal(){document.getElementById('lp-modal').classList.remove('open');}
async function saveLP(){
  const po_number=document.getElementById('lp-f-pono').value.trim();
  const part_name=document.getElementById('lp-f-part').value.trim();
  if(!po_number||!part_name){gToast('PO / Reference No. and Part Name are required.','error');return;}
  const qty=+(document.getElementById('lp-f-qty').value)||0;
  const unit_price=+(document.getElementById('lp-f-uprice').value)||0;
  const body={
    po_number,
    part_name,
    supplier:document.getElementById('lp-f-supplier').value.trim(),
    status:document.getElementById('lp-f-status').value,
    qty_ordered:qty,
    unit_price:unit_price,
    total:(qty*unit_price).toFixed(2),
    order_date:document.getElementById('lp-f-orderdate').value,
    expected_date:document.getElementById('lp-f-expdate').value,
    remarks:document.getElementById('lp-f-remarks').value.trim()
  };
  try{
    const url=lpEditId?API+'/local-purchases/'+lpEditId:API+'/local-purchases';
    const res=await fetch(url,{method:lpEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}
    gToast(lpEditId?'Purchase updated!':'Purchase added!');
    closeLPModal();loadLP();
  }catch(err){gToast(err.message,'error');}
}
function openLPDelModal(id,name){lpDeleteId=id;document.getElementById('lp-del-name').textContent=name;document.getElementById('lp-del-modal').classList.add('open');}
function closeLPDelModal(){document.getElementById('lp-del-modal').classList.remove('open');}
async function confirmDeleteLP(){
  try{await fetch(API+'/local-purchases/'+lpDeleteId,{method:'DELETE'});gToast('Purchase deleted.');closeLPDelModal();loadLP();}
  catch{gToast('Delete failed','error');}
}

// ── PURCHASE ORDERS ─────────────────────────────────────────
async function loadPO(){try{const r=await fetch(API+'/purchase-orders');poData=await r.json();renderPO();}catch{document.getElementById('po-body').innerHTML='<tr><td colspan="8"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderPO(){
  const q=(document.getElementById('po-search').value||'').toLowerCase();const ft=document.getElementById('po-filter').value;
  let rows=poData.filter(r=>(!q||(r.po_number||'').toLowerCase().includes(q)||(r.supplier||'').toLowerCase().includes(q))&&(!ft||r.status===ft));
  document.getElementById('po-meta').textContent=`Showing ${rows.length} of ${poData.length}`;
  document.getElementById('po-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.po_number}</strong></td><td>${r.supplier}</td><td>${r.order_date||'—'}</td><td>${badge(r.status)}</td><td>${fmt(r.total_amount)}</td><td>${fileLink(r)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openPOModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openPODelModal(${r.id},'${(r.po_number||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="8"><div class="no-results">No purchase orders.</div></td></tr>';
}
function openPOModal(id=null){poEditId=id;const r=id?poData.find(x=>x.id===id):null;document.getElementById('po-modal-title').textContent=id?'Edit PO':'Add Purchase Order';document.getElementById('po-f-no').value=r?r.po_number:'';document.getElementById('po-f-supplier').value=r?r.supplier:'';document.getElementById('po-f-date').value=r?r.order_date:today();document.getElementById('po-f-status').value=r?r.status:'Pending';document.getElementById('po-f-amount').value=r?r.total_amount:'';document.getElementById('po-f-file').value='';document.getElementById('po-cur-file').innerHTML=r&&r.file_name?`Current: <a class="file-link" href="http://localhost:3000${r.file_path}" target="_blank">${r.file_name.replace(/^\d+[-_]/,'')}</a>`:'';document.getElementById('po-modal').classList.add('open');}
function closePOModal(){document.getElementById('po-modal').classList.remove('open');}
async function savePO(){
  const fd=new FormData();fd.append('po_number',document.getElementById('po-f-no').value.trim());fd.append('supplier',document.getElementById('po-f-supplier').value.trim());fd.append('order_date',document.getElementById('po-f-date').value);fd.append('status',document.getElementById('po-f-status').value);fd.append('total_amount',document.getElementById('po-f-amount').value||0);const fi=document.getElementById('po-f-file');if(fi.files[0])fd.append('file',fi.files[0]);
  if(!fd.get('po_number')||!fd.get('supplier')){gToast('PO number and supplier required.','error');return;}
  try{const url=poEditId?API+'/purchase-orders/'+poEditId:API+'/purchase-orders';const res=await fetch(url,{method:poEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(poEditId?'Updated!':'Added!');closePOModal();loadPO();}catch(err){gToast(err.message,'error');}
}
function openPODelModal(id,name){poDeleteId=id;document.getElementById('po-del-name').textContent=name;document.getElementById('po-del-modal').classList.add('open');}
function closePODelModal(){document.getElementById('po-del-modal').classList.remove('open');}
async function confirmDeletePO(){try{await fetch(API+'/purchase-orders/'+poDeleteId,{method:'DELETE'});gToast('Deleted.');closePODelModal();loadPO();}catch{gToast('Delete failed','error');}}

// ── SUPPLIERS ────────────────────────────────────────────────
async function loadSup(){try{const r=await fetch(API+'/suppliers');supData=await r.json();renderSup();}catch{document.getElementById('sup-body').innerHTML='<tr><td colspan="10"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderSup(){
  const q=(document.getElementById('sup-search').value||'').toLowerCase();
  const rows=q?supData.filter(r=>(r.name||'').toLowerCase().includes(q)||(r.code||'').toLowerCase().includes(q)||(r.contact_person||'').toLowerCase().includes(q)):supData;
  document.getElementById('sup-meta').textContent=`Showing ${rows.length} of ${supData.length}`;
  document.getElementById('sup-body').innerHTML=rows.map((r,i)=>{
    const bg=avatarColor(r.name);
    return `<tr><td>${i+1}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="sup-avatar" style="background:${bg}">${ini(r.name)}</div><div><div style="font-weight:600">${r.name}</div><div style="font-size:11px;color:var(--text-2)">${r.code}</div></div></div></td>
    <td>${r.contact_person||'—'}</td><td>${r.email||'—'}</td><td>${r.phone||'—'}</td><td>${r.category||'—'}</td><td>${r.location||'—'}</td><td>${badge(r.status||'Active')}</td>
    <td>${r.file_2303_name?`<a class="file-link" href="http://localhost:3000${r.file_2303_path}" target="_blank">📎 ${r.file_2303_name}</a>`:'—'}</td>
    <td><button class="page-act-btn btn-edit" onclick="openSupModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openSupDelModal(${r.id},'${(r.name||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`;
  }).join('')||'<tr><td colspan="10"><div class="no-results">No suppliers.</div></td></tr>';
}
function openSupModal(id=null){supEditId=id;const r=id?supData.find(x=>x.id===id):null;document.getElementById('sup-modal-title').textContent=id?'Edit Supplier':'Add Supplier';['code','name','contact','role','email','phone','category','location'].forEach(k=>{const map={code:r?.code,name:r?.name,contact:r?.contact_person,role:r?.role,email:r?.email,phone:r?.phone,category:r?.category,location:r?.location};document.getElementById('sup-f-'+k).value=map[k]||'';});document.getElementById('sup-f-status').value=r?r.status:'Active';document.getElementById('sup-f-2303').value='';document.getElementById('sup-cur-2303').innerHTML=r&&r.file_2303_name?`Current: <a class="file-link" href="http://localhost:3000${r.file_2303_path}" target="_blank">${r.file_2303_name}</a>`:'';document.getElementById('sup-modal').classList.add('open');}
function closeSupModal(){document.getElementById('sup-modal').classList.remove('open');}
async function saveSup(){
  const fd=new FormData();['code','name','contact','role','email','phone','category','location'].forEach(k=>{const map={code:'sup-f-code',name:'sup-f-name',contact:'sup-f-contact',role:'sup-f-role',email:'sup-f-email',phone:'sup-f-phone',category:'sup-f-category',location:'sup-f-location'};fd.append(k==='contact'?'contact_person':k,document.getElementById(map[k]).value.trim());});
  fd.append('status',document.getElementById('sup-f-status').value);const fi=document.getElementById('sup-f-2303');if(fi.files[0])fd.append('file_2303',fi.files[0]);
  if(!fd.get('code')||!fd.get('name')){gToast('Code and name required.','error');return;}
  try{const url=supEditId?API+'/suppliers/'+supEditId:API+'/suppliers';const res=await fetch(url,{method:supEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(supEditId?'Updated!':'Added!');closeSupModal();loadSup();}catch(err){gToast(err.message,'error');}
}
function openSupDelModal(id,name){supDeleteId=id;document.getElementById('sup-del-name').textContent=name;document.getElementById('sup-del-modal').classList.add('open');}
function closeSupDelModal(){document.getElementById('sup-del-modal').classList.remove('open');}
async function confirmDeleteSup(){try{await fetch(API+'/suppliers/'+supDeleteId,{method:'DELETE'});gToast('Deleted.');closeSupDelModal();loadSup();}catch{gToast('Delete failed','error');}}

// ── GOODS RECEIVED ──────────────────────────────────────────
async function loadGR(){try{const r=await fetch(API+'/goods-received');grData=await r.json();renderGR();}catch{document.getElementById('gr-body').innerHTML='<tr><td colspan="9"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderGR(){
  const q=(document.getElementById('gr-search').value||'').toLowerCase();
  const rows=q?grData.filter(r=>(r.gr_number||'').toLowerCase().includes(q)||(r.supplier||'').toLowerCase().includes(q)):grData;
  document.getElementById('gr-meta').textContent=`Showing ${rows.length} of ${grData.length}`;
  document.getElementById('gr-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.gr_number}</strong></td><td>${r.po_number||'—'}</td><td>${r.supplier}</td><td>${r.received_date||'—'}</td><td>${r.received_by||'—'}</td><td>${r.total_items||0}</td><td>${badge(r.status)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openGRModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openGRDelModal(${r.id},'${(r.gr_number||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="9"><div class="no-results">No records.</div></td></tr>';
}
function openGRModal(id=null){grEditId=id;const r=id?grData.find(x=>x.id===id):null;document.getElementById('gr-modal-title').textContent=id?'Edit GR':'Add Goods Received';document.getElementById('gr-f-grno').value=r?r.gr_number:'';document.getElementById('gr-f-pono').value=r?r.po_number:'';document.getElementById('gr-f-supplier').value=r?r.supplier:'';document.getElementById('gr-f-date').value=r?r.received_date:today();document.getElementById('gr-f-by').value=r?r.received_by:'';document.getElementById('gr-f-items').value=r?r.total_items:0;document.getElementById('gr-f-status').value=r?r.status:'Pending';document.getElementById('gr-modal').classList.add('open');}
function closeGRModal(){document.getElementById('gr-modal').classList.remove('open');}
async function saveGR(){
  const body={gr_number:document.getElementById('gr-f-grno').value.trim(),po_number:document.getElementById('gr-f-pono').value.trim(),supplier:document.getElementById('gr-f-supplier').value.trim(),received_date:document.getElementById('gr-f-date').value,received_by:document.getElementById('gr-f-by').value.trim(),total_items:+document.getElementById('gr-f-items').value||0,status:document.getElementById('gr-f-status').value};
  if(!body.gr_number||!body.supplier){gToast('GR number and supplier required.','error');return;}
  try{const url=grEditId?API+'/goods-received/'+grEditId:API+'/goods-received';const res=await fetch(url,{method:grEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(grEditId?'Updated!':'Added!');closeGRModal();loadGR();}catch(err){gToast(err.message,'error');}
}
function openGRDelModal(id,name){grDeleteId=id;document.getElementById('gr-del-name').textContent=name;document.getElementById('gr-del-modal').classList.add('open');}
function closeGRDelModal(){document.getElementById('gr-del-modal').classList.remove('open');}
async function confirmDeleteGR(){try{await fetch(API+'/goods-received/'+grDeleteId,{method:'DELETE'});gToast('Deleted.');closeGRDelModal();loadGR();}catch{gToast('Delete failed','error');}}

// ── STOCK TRANSFERS ─────────────────────────────────────────
async function loadST(){try{const r=await fetch(API+'/stock-transfers');stData=await r.json();renderST();}catch{document.getElementById('st-body').innerHTML='<tr><td colspan="9"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderST(){
  const q=(document.getElementById('st-search').value||'').toLowerCase();
  const rows=q?stData.filter(r=>(r.transfer_no||'').toLowerCase().includes(q)||(r.source_location||'').toLowerCase().includes(q)||(r.destination_location||'').toLowerCase().includes(q)):stData;
  document.getElementById('st-meta').textContent=`Showing ${rows.length} of ${stData.length}`;
  document.getElementById('st-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.transfer_no}</strong></td><td>${r.source_location}</td><td>${r.destination_location}</td><td>${r.transfer_date||'—'}</td><td>${r.items_count||0}</td><td>${badge(r.status)}</td><td>${r.transferred_by||'—'}</td>
    <td><button class="page-act-btn btn-edit" onclick="openSTModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openSTDelModal(${r.id},'${(r.transfer_no||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="9"><div class="no-results">No transfers.</div></td></tr>';
}
function openSTModal(id=null){stEditId=id;const r=id?stData.find(x=>x.id===id):null;document.getElementById('st-modal-title').textContent=id?'Edit Transfer':'Add Stock Transfer';document.getElementById('st-f-no').value=r?r.transfer_no:'';document.getElementById('st-f-date').value=r?r.transfer_date:today();document.getElementById('st-f-from').value=r?r.source_location:'';document.getElementById('st-f-to').value=r?r.destination_location:'';document.getElementById('st-f-items').value=r?r.items_count:0;document.getElementById('st-f-status').value=r?r.status:'Pending';document.getElementById('st-f-by').value=r?r.transferred_by:'';document.getElementById('st-modal').classList.add('open');}
function closeSTModal(){document.getElementById('st-modal').classList.remove('open');}
async function saveST(){
  const body={transfer_no:document.getElementById('st-f-no').value.trim(),transfer_date:document.getElementById('st-f-date').value,source_location:document.getElementById('st-f-from').value.trim(),destination_location:document.getElementById('st-f-to').value.trim(),items_count:+document.getElementById('st-f-items').value||0,status:document.getElementById('st-f-status').value,transferred_by:document.getElementById('st-f-by').value.trim()};
  if(!body.transfer_no||!body.source_location||!body.destination_location){gToast('Transfer No, From, and To are required.','error');return;}
  try{const url=stEditId?API+'/stock-transfers/'+stEditId:API+'/stock-transfers';const res=await fetch(url,{method:stEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(stEditId?'Updated!':'Added!');closeSTModal();loadST();}catch(err){gToast(err.message,'error');}
}
function openSTDelModal(id,name){stDeleteId=id;document.getElementById('st-del-name').textContent=name;document.getElementById('st-del-modal').classList.add('open');}
function closeSTDelModal(){document.getElementById('st-del-modal').classList.remove('open');}
async function confirmDeleteST(){try{await fetch(API+'/stock-transfers/'+stDeleteId,{method:'DELETE'});gToast('Deleted.');closeSTDelModal();loadST();}catch{gToast('Delete failed','error');}}

// ── REPORTS ──────────────────────────────────────────────────
async function loadIR(){
  try{const r=await fetch(API+'/spare-parts');irData=await r.json();renderIR();}
  catch{document.getElementById('ir-body').innerHTML='<tr><td colspan="8"><div class="no-results">Backend offline.</div></td></tr>';}
}
function renderIR(){
  const q=(document.getElementById('ir-search').value||'').toLowerCase();
  const computed=irData.map(r=>({...r,...smCalc(r)}));
  const rows=q?computed.filter(r=>(r.name||'').toLowerCase().includes(q)||(r.part_no||'').toLowerCase().includes(q)||(r.machine||'').toLowerCase().includes(q)):computed;
  document.getElementById('ir-meta').textContent=`Showing ${rows.length} of ${irData.length}`;
  document.getElementById('ir-body').innerHTML=rows.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong>${esc(r.name)}</strong></td>
    <td>${esc(r.part_no)||'—'}</td>
    <td>${esc(r.machine)||'—'}</td>
    <td>${r.on_hand??0}</td>
    <td>${r.on_order??0}</td>
    <td>${r.monthly_usage??0}</td>
    <td><strong>${r.rq||0}</strong></td>
  </tr>`).join('')||'<tr><td colspan="8"><div class="no-results">No spare parts found.</div></td></tr>';
}
function exportIRExcel(){
  if(!irData.length){gToast('No data to export.','error');return;}
  const computed=irData.map(r=>({...r,...smCalc(r)}));
  const ws=XLSX.utils.json_to_sheet(computed.map(r=>({
    'Part Name':r.name,
    'Part Number':r.part_no||'',
    'Machine Use':r.machine||'',
    'On Hand':r.on_hand??0,
    'On Order':r.on_order??0,
    'Monthly Usage':r.monthly_usage??0,
    'Reorder Qty':r.rq||0
  })));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Inventory Report');
  XLSX.writeFile(wb,'InventoryReport.xlsx');
}
function exportIRPdf(){
  if(!irData.length){gToast('No data to export.','error');return;}
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape'});
  const computed=irData.map(r=>({...r,...smCalc(r)}));
  doc.setFontSize(14);
  doc.text('Inventory Report',14,15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`,14,22);
  doc.autoTable({
    head:[['#','Part Name','Part Number','Machine Use','On Hand','On Order','Monthly Usage','Reorder Qty']],
    body:computed.map((r,i)=>[i+1,r.name,r.part_no||'—',r.machine||'—',r.on_hand??0,r.on_order??0,r.monthly_usage??0,r.rq||0]),
    startY:26,
    styles:{fontSize:9,cellPadding:3},
    headStyles:{fillColor:[30,58,138],textColor:255,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[245,247,255]}
  });
  doc.save('InventoryReport.pdf');
}
async function loadPR(){try{const r=await fetch(API+'/purchase-orders');poData=await r.json();renderPR();}catch{}}
function renderPR(){
  const q=(document.getElementById('pr-search').value||'').toLowerCase();
  const rows=q?poData.filter(r=>(r.po_number||'').toLowerCase().includes(q)||(r.supplier||'').toLowerCase().includes(q)):poData;
  let tot=0;document.getElementById('pr-body').innerHTML=rows.map((r,i)=>{tot+=+r.total_amount||0;return`<tr><td>${i+1}</td><td>${r.po_number}</td><td>${r.supplier}</td><td>${r.order_date||'—'}</td><td>${badge(r.status)}</td><td>${fmt(r.total_amount)}</td></tr>`;}).join('')||'<tr><td colspan="6"><div class="no-results">No data.</div></td></tr>';
  document.getElementById('pr-f-total').textContent=fmt(tot);
}
function exportPRExcel(){const ws=XLSX.utils.json_to_sheet(poData.map(r=>({'PO Number':r.po_number,'Supplier':r.supplier,'Order Date':r.order_date,'Status':r.status,'Total Amount':r.total_amount})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'PurchaseReport');XLSX.writeFile(wb,'PurchaseReport.xlsx');}
function exportPRPdf(){const {jsPDF}=window.jspdf;const doc=new jsPDF();doc.text('Purchase Report',14,16);doc.autoTable({head:[['PO Number','Supplier','Order Date','Status','Total']],body:poData.map(r=>[r.po_number,r.supplier,r.order_date||'—',r.status,fmt(r.total_amount)]),startY:20});doc.save('PurchaseReport.pdf');}

// ── ALERTS ───────────────────────────────────────────────────
async function loadAlerts(){
  const ids=['alert-outofstock','alert-lowstock','alert-ordernow'];
  ids.forEach(id=>document.getElementById(id).innerHTML='<div class="alert-empty">Loading...</div>');
  try{
    const parts=await fetch(API+'/spare-parts').then(r=>r.json());
    // ── Classify each part ──────────────────────────────────
    const out   =parts.filter(p=>(+p.on_hand||0)===0);
    const low   =parts.filter(p=>(+p.on_hand||0)>0&&(+p.on_hand||0)<=10);
    const order =parts.filter(p=>{
      const mu=+p.monthly_usage||0,lt=+p.lead_time||0,buf=+p.buffer||0,ss=+p.safety_stock||0;
      const rp=Math.ceil(mu*(lt+buf)+mu*ss);
      const net=(+p.on_hand||0)+(+p.on_order||0);
      return rp>net&&(+p.on_hand||0)>0; // exclude already out-of-stock
    });
    // ── Shared table builder ────────────────────────────────
    const thead=`<div class="page-tbl-wrap"><table class="page-table"><thead><tr>
      <th>#</th><th>Name</th><th>Part No.</th><th>Machine</th>
      <th>On Hand</th><th>On Order</th><th>Monthly Usage</th><th>Lead Time</th><th>Reorder Point</th>
    </tr></thead><tbody>`;
    const rp=p=>{const mu=+p.monthly_usage||0,lt=+p.lead_time||0,buf=+p.buffer||0,ss=+p.safety_stock||0;return Math.ceil(mu*(lt+buf)+mu*ss);};
    const row=(p,i)=>`<tr>
      <td style="color:#94a3b8;font-size:12px">${i+1}</td>
      <td><strong>${p.name||'—'}</strong></td>
      <td style="color:#94a3b8;font-size:12px">${p.part_no||'—'}</td>
      <td><span class="cat-pill">${p.machine||'—'}</span></td>
      <td style="font-weight:700;text-align:center">${p.on_hand??0}</td>
      <td style="text-align:center">${p.on_order??0}</td>
      <td style="text-align:center">${p.monthly_usage??0}</td>
      <td style="text-align:center">${p.lead_time??0}</td>
      <td style="text-align:center;font-weight:600;color:var(--primary)">${rp(p)}</td>
    </tr>`;
    const tbl=rows=>rows.length
      ?thead+rows.map(row).join('')+'</tbody></table></div>'
      :`<div class="alert-empty">✅ None</div>`;
    // ── Render ──────────────────────────────────────────────
    document.getElementById('alert-outofstock').innerHTML=tbl(out);
    document.getElementById('alert-lowstock'  ).innerHTML=tbl(low);
    document.getElementById('alert-ordernow'  ).innerHTML=tbl(order);
    // ── Counts ──────────────────────────────────────────────
    document.getElementById('alert-out-count'  ).textContent=out.length;
    document.getElementById('alert-low-count'  ).textContent=low.length;
    document.getElementById('alert-order-count').textContent=order.length;
    const total=out.length+low.length+order.length;
    const badge=document.getElementById('alert-badge');
    badge.textContent=total; badge.style.display=total>0?'':'none';
  }catch{
    ids.forEach(id=>document.getElementById(id).innerHTML='<div class="alert-empty">⚠️ Backend offline.</div>');
  }
}

async function loadAlertBadge(){
  try{
    const parts=await fetch(API+'/spare-parts').then(r=>r.json());
    const out  =parts.filter(p=>(+p.on_hand||0)===0).length;
    const low  =parts.filter(p=>(+p.on_hand||0)>0&&(+p.on_hand||0)<=10).length;
    const total=out+low;
    const b=document.getElementById('alert-badge');
    b.textContent=total; b.style.display=total>0?'':'none';
  }catch{}
}

// ── LOGISTICS ────────────────────────────────────────────────
function loadLogistics(){loadTQ();loadMP();loadSA();loadWB();}
function switchLogTab(tab,btn){document.querySelectorAll('.log-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');document.querySelectorAll('.log-panel').forEach(p=>p.classList.remove('active'));document.getElementById('log-panel-'+tab).classList.add('active');}

// Trucking
async function loadTQ(){try{const r=await fetch(API+'/logistics/trucking');tqData=await r.json();renderTQ();}catch{document.getElementById('tq-body').innerHTML='<tr><td colspan="9"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderTQ(){
  const q=(document.getElementById('tq-search').value||'').toLowerCase();
  const rows=q?tqData.filter(r=>(r.quote_number||'').toLowerCase().includes(q)||(r.trucking_service||'').toLowerCase().includes(q)):tqData;
  document.getElementById('tq-meta').textContent=`Showing ${rows.length} of ${tqData.length}`;
  document.getElementById('tq-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.quote_number}</strong></td><td>${r.trucking_service}</td><td>${r.date_of_activity||'—'}</td><td>${r.sites||'—'}</td><td>${fmt(r.total_amount)}</td><td>${badge(r.status)}</td><td>${fileLink(r)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openTQModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openTQDelModal(${r.id},'${(r.quote_number||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="9"><div class="no-results">No quotations.</div></td></tr>';
}
function openTQModal(id=null){tqEditId=id;const r=id?tqData.find(x=>x.id===id):null;document.getElementById('tq-modal-title').textContent=id?'Edit Quotation':'Add Quotation';document.getElementById('tq-f-qno').value=r?r.quote_number:'';document.getElementById('tq-f-service').value=r?r.trucking_service:'';document.getElementById('tq-f-date').value=r?r.date_of_activity:today();document.getElementById('tq-f-status').value=r?r.status:'Pending';document.getElementById('tq-f-sites').value=r?r.sites:'';document.getElementById('tq-f-amount').value=r?r.total_amount:'';document.getElementById('tq-f-file').value='';document.getElementById('tq-cur-file').innerHTML=r&&r.file_name?`Current: <a class="file-link" href="http://localhost:3000${r.file_path}" target="_blank">${r.file_name.replace(/^\d+[-_]/,'')}</a>`:'';document.getElementById('tq-modal').classList.add('open');}
function closeTQModal(){document.getElementById('tq-modal').classList.remove('open');}
async function saveTQ(){const fd=new FormData();fd.append('quote_number',document.getElementById('tq-f-qno').value.trim());fd.append('trucking_service',document.getElementById('tq-f-service').value.trim());fd.append('date_of_activity',document.getElementById('tq-f-date').value);fd.append('status',document.getElementById('tq-f-status').value);fd.append('sites',document.getElementById('tq-f-sites').value.trim());fd.append('total_amount',document.getElementById('tq-f-amount').value||0);const fi=document.getElementById('tq-f-file');if(fi.files[0])fd.append('file',fi.files[0]);if(!fd.get('quote_number')||!fd.get('trucking_service')){gToast('Quote number and service required.','error');return;}try{const url=tqEditId?API+'/logistics/trucking/'+tqEditId:API+'/logistics/trucking';const res=await fetch(url,{method:tqEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(tqEditId?'Updated!':'Added!');closeTQModal();loadTQ();}catch(err){gToast(err.message,'error');}}
function openTQDelModal(id,name){tqDeleteId=id;document.getElementById('tq-del-name').textContent=name;document.getElementById('tq-del-modal').classList.add('open');}
function closeTQDelModal(){document.getElementById('tq-del-modal').classList.remove('open');}
async function confirmDeleteTQ(){try{await fetch(API+'/logistics/trucking/'+tqDeleteId,{method:'DELETE'});gToast('Deleted.');closeTQDelModal();loadTQ();}catch{gToast('Delete failed','error');}}

// Manpower
async function loadMP(){try{const r=await fetch(API+'/logistics/manpower');mpData=await r.json();renderMP();}catch{document.getElementById('mp-body').innerHTML='<tr><td colspan="10"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderMP(){
  const q=(document.getElementById('mp-search').value||'').toLowerCase();
  const rows=q?mpData.filter(r=>(r.request_no||'').toLowerCase().includes(q)||(r.location||'').toLowerCase().includes(q)||(r.machine_type||'').toLowerCase().includes(q)):mpData;
  document.getElementById('mp-meta').textContent=`Showing ${rows.length} of ${mpData.length}`;
  const gt=rows.reduce((a,r)=>a+(+r.total||0),0);
  document.getElementById('mp-grand-total').textContent=fmt(gt);
  document.getElementById('mp-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.request_no}</strong></td><td>${r.location}</td><td>${r.machine_type||'—'}</td><td>${r.manpower_quantity||0}</td><td>${fmt(r.unit_price)}</td><td>${fmt(r.total)}</td><td>${r.purpose||'—'}</td><td>${fileLink(r)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openMPModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openMPDelModal(${r.id},'${(r.request_no||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="10"><div class="no-results">No requests.</div></td></tr>';
}
function calcMPTotal(){const q=+document.getElementById('mp-f-mpqty').value||0;const p=+document.getElementById('mp-f-up').value||0;document.getElementById('mp-f-total').value=fmt(q*p);}
async function openMPModal(id=null){mpEditId=id;const r=id?mpData.find(x=>x.id===id):null;document.getElementById('mp-modal-title').textContent=id?'Edit Request':'Add Manpower Request';if(!id){try{const res=await fetch(API+'/logistics/manpower/next-request-no');const d=await res.json();document.getElementById('mp-f-rno').value=d.request_no;}catch{document.getElementById('mp-f-rno').value='Auto';}}else{document.getElementById('mp-f-rno').value=r.request_no;}document.getElementById('mp-f-loc').value=r?r.location:'';document.getElementById('mp-f-mtype').value=r?r.machine_type:'';document.getElementById('mp-f-mpqty').value=r?r.manpower_quantity:0;document.getElementById('mp-f-up').value=r?r.unit_price:0;calcMPTotal();document.getElementById('mp-f-purpose').value=r?r.purpose:'';document.getElementById('mp-f-remarks').value=r?r.remarks:'';document.getElementById('mp-f-file').value='';document.getElementById('mp-cur-file').innerHTML=r&&r.file_name?`Current: <a class="file-link" href="http://localhost:3000${r.file_path}" target="_blank">${r.file_name.replace(/^\d+[-_]/,'')}</a>`:'';document.getElementById('mp-modal').classList.add('open');}
function closeMPModal(){document.getElementById('mp-modal').classList.remove('open');}
async function saveMP(){const fd=new FormData();fd.append('location',document.getElementById('mp-f-loc').value.trim());fd.append('machine_type',document.getElementById('mp-f-mtype').value.trim());fd.append('manpower_quantity',document.getElementById('mp-f-mpqty').value||0);fd.append('unit_price',document.getElementById('mp-f-up').value||0);fd.append('purpose',document.getElementById('mp-f-purpose').value.trim());fd.append('remarks',document.getElementById('mp-f-remarks').value.trim());const fi=document.getElementById('mp-f-file');if(fi.files[0])fd.append('file',fi.files[0]);if(!fd.get('location')||!fd.get('machine_type')){gToast('Location and machine type required.','error');return;}try{const url=mpEditId?API+'/logistics/manpower/'+mpEditId:API+'/logistics/manpower';const res=await fetch(url,{method:mpEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(mpEditId?'Updated!':'Added!');closeMPModal();loadMP();}catch(err){gToast(err.message,'error');}}
function openMPDelModal(id,name){mpDeleteId=id;document.getElementById('mp-del-name').textContent=name;document.getElementById('mp-del-modal').classList.add('open');}
function closeMPDelModal(){document.getElementById('mp-del-modal').classList.remove('open');}
async function confirmDeleteMP(){try{await fetch(API+'/logistics/manpower/'+mpDeleteId,{method:'DELETE'});gToast('Deleted.');closeMPDelModal();loadMP();}catch{gToast('Delete failed','error');}}

// Sites Activity
async function loadSA(){try{const r=await fetch(API+'/logistics/sites-activity');saData=await r.json();renderSA();}catch{document.getElementById('sa-body').innerHTML='<tr><td colspan="9"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderSA(){
  const q=(document.getElementById('sa-search').value||'').toLowerCase();const ft=document.getElementById('sa-filter').value;
  const rows=saData.filter(r=>(!q||(r.site_name||'').toLowerCase().includes(q)||(r.location||'').toLowerCase().includes(q))&&(!ft||r.activity_type===ft));
  document.getElementById('sa-meta').textContent=`Showing ${rows.length} of ${saData.length}`;
  document.getElementById('sa-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.site_name}</strong></td><td>${badge(r.activity_type)}</td><td>${r.activity_date||'—'}</td><td>${r.location||'—'}</td><td>${r.description||'—'}</td><td>${badge(r.status)}</td><td>${fileLink(r)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openSAModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openSADelModal(${r.id},'${(r.site_name||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="9"><div class="no-results">No activities.</div></td></tr>';
}
function openSAModal(id=null){saEditId=id;const r=id?saData.find(x=>x.id===id):null;document.getElementById('sa-modal-title').textContent=id?'Edit Activity':'Add Site Activity';document.getElementById('sa-f-site').value=r?r.site_name:'';document.getElementById('sa-f-type').value=r?r.activity_type:'Delivery';document.getElementById('sa-f-date').value=r?r.activity_date:today();document.getElementById('sa-f-status').value=r?r.status:'Scheduled';document.getElementById('sa-f-loc').value=r?r.location:'';document.getElementById('sa-f-desc').value=r?r.description:'';document.getElementById('sa-f-file').value='';document.getElementById('sa-modal').classList.add('open');}
function closeSAModal(){document.getElementById('sa-modal').classList.remove('open');}
async function saveSA(){const fd=new FormData();fd.append('site_name',document.getElementById('sa-f-site').value.trim());fd.append('activity_type',document.getElementById('sa-f-type').value);fd.append('activity_date',document.getElementById('sa-f-date').value);fd.append('status',document.getElementById('sa-f-status').value);fd.append('location',document.getElementById('sa-f-loc').value.trim());fd.append('description',document.getElementById('sa-f-desc').value.trim());const fi=document.getElementById('sa-f-file');if(fi.files[0])fd.append('file',fi.files[0]);if(!fd.get('site_name')){gToast('Site name required.','error');return;}try{const url=saEditId?API+'/logistics/sites-activity/'+saEditId:API+'/logistics/sites-activity';const res=await fetch(url,{method:saEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(saEditId?'Updated!':'Added!');closeSAModal();loadSA();}catch(err){gToast(err.message,'error');}}
function openSADelModal(id,name){saDeleteId=id;document.getElementById('sa-del-name').textContent=name;document.getElementById('sa-del-modal').classList.add('open');}
function closeSADelModal(){document.getElementById('sa-del-modal').classList.remove('open');}
async function confirmDeleteSA(){try{await fetch(API+'/logistics/sites-activity/'+saDeleteId,{method:'DELETE'});gToast('Deleted.');closeSADelModal();loadSA();}catch{gToast('Delete failed','error');}}

// Waybills
async function loadWB(){try{const r=await fetch(API+'/logistics/waybills');wbData=await r.json();renderWB();}catch{document.getElementById('wb-body').innerHTML='<tr><td colspan="8"><div class="no-results">Backend offline.</div></td></tr>';}}
function renderWB(){
  const q=(document.getElementById('wb-search').value||'').toLowerCase();
  const rows=q?wbData.filter(r=>(r.waybill_number||'').toLowerCase().includes(q)||(r.origin||'').toLowerCase().includes(q)||(r.destination||'').toLowerCase().includes(q)):wbData;
  document.getElementById('wb-meta').textContent=`Showing ${rows.length} of ${wbData.length}`;
  document.getElementById('wb-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.waybill_number}</strong></td><td>${r.date||'—'}</td><td>${r.origin||'—'}</td><td>${r.destination||'—'}</td><td>${r.notes||'—'}</td><td>${fileLink(r)}</td>
    <td><button class="page-act-btn btn-edit" onclick="openWBModal(${r.id})">Edit</button><button class="page-act-btn btn-del" onclick="openWBDelModal(${r.id},'${(r.waybill_number||'').replace(/'/g,"\\'")}')">Del</button></td></tr>`).join('')||'<tr><td colspan="8"><div class="no-results">No waybills.</div></td></tr>';
}
function openWBModal(id=null){wbEditId=id;const r=id?wbData.find(x=>x.id===id):null;document.getElementById('wb-modal-title').textContent=id?'Edit Waybill':'Add Waybill';document.getElementById('wb-f-wno').value=r?r.waybill_number:'';document.getElementById('wb-f-date').value=r?r.date:today();document.getElementById('wb-f-origin').value=r?r.origin:'';document.getElementById('wb-f-dest').value=r?r.destination:'';document.getElementById('wb-f-notes').value=r?r.notes:'';document.getElementById('wb-f-file').value='';document.getElementById('wb-cur-file').innerHTML=r&&r.file_name?`Current: <a class="file-link" href="http://localhost:3000${r.file_path}" target="_blank">${r.file_name.replace(/^\d+[-_]/,'')}</a>`:'';document.getElementById('wb-modal').classList.add('open');}
function closeWBModal(){document.getElementById('wb-modal').classList.remove('open');}
async function saveWB(){const fd=new FormData();fd.append('waybill_number',document.getElementById('wb-f-wno').value.trim());fd.append('date',document.getElementById('wb-f-date').value);fd.append('origin',document.getElementById('wb-f-origin').value.trim());fd.append('destination',document.getElementById('wb-f-dest').value.trim());fd.append('notes',document.getElementById('wb-f-notes').value.trim());const fi=document.getElementById('wb-f-file');if(fi.files[0])fd.append('file',fi.files[0]);if(!fd.get('waybill_number')){gToast('Waybill number required.','error');return;}try{const url=wbEditId?API+'/logistics/waybills/'+wbEditId:API+'/logistics/waybills';const res=await fetch(url,{method:wbEditId?'PUT':'POST',body:fd});if(!res.ok){const e=await res.json();throw new Error(e.error||'Save failed');}gToast(wbEditId?'Updated!':'Added!');closeWBModal();loadWB();}catch(err){gToast(err.message,'error');}}
function openWBDelModal(id,name){wbDeleteId=id;document.getElementById('wb-del-name').textContent=name;document.getElementById('wb-del-modal').classList.add('open');}
function closeWBDelModal(){document.getElementById('wb-del-modal').classList.remove('open');}
async function confirmDeleteWB(){try{await fetch(API+'/logistics/waybills/'+wbDeleteId,{method:'DELETE'});gToast('Deleted.');closeWBDelModal();loadWB();}catch{gToast('Delete failed','error');}}

// ── ACTIVITY CALENDAR ────────────────────────────────────────
const AC_CAT_COLOR={Work:'#6366f1',Meeting:'#f59e0b',Delivery:'#10b981',Maintenance:'#8b5cf6',Personal:'#ec4899',General:'#64748b'};
async function loadACEvents(){
  acEvents={};
  try{
    const r=await fetch(API+'/calendar/tasks');
    acTasksData=r.ok?await r.json():[];
    const filtered=acCategoryFilter?acTasksData.filter(t=>t.category===acCategoryFilter):acTasksData;
    filtered.forEach(t=>{const d=t.task_date.slice(0,10);if(!acEvents[d])acEvents[d]=[];acEvents[d].push(t);});
  }catch{acTasksData=[];}
  renderACCalendar();
  loadACNotifications();
  if(acSelectedDate)acSelectDay(acSelectedDate);
}
function acSetFilter(cat,btn){
  acCategoryFilter=cat;
  document.querySelectorAll('.ac-filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  loadACEvents();
}
function acGoToday(){const n=new Date();acYear=n.getFullYear();acMonth=n.getMonth();renderACCalendar();}
function acChangeMonth(dir){acMonth+=dir;if(acMonth>11){acMonth=0;acYear++;}if(acMonth<0){acMonth=11;acYear--;}renderACCalendar();}
function renderACCalendar(){
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('ac-month-title').textContent=MONTHS[acMonth]+' '+acYear;
  document.getElementById('ac-summary-month').textContent=MONTHS[acMonth]+' '+acYear;
  const now=new Date();const firstDay=new Date(acYear,acMonth,1).getDay();const daysInMonth=new Date(acYear,acMonth+1,0).getDate();const daysInPrev=new Date(acYear,acMonth,0).getDate();
  let cells='';
  for(let i=firstDay-1;i>=0;i--)cells+=`<div class="ac-cell ac-other-month"><div class="ac-day-num">${daysInPrev-i}</div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const iso=`${acYear}-${String(acMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=d===now.getDate()&&acMonth===now.getMonth()&&acYear===now.getFullYear();
    const isSel=iso===acSelectedDate;
    const evs=acEvents[iso]||[];
    const dots=evs.slice(0,5).map(e=>`<div class="ac-dot" style="background:${e.color||AC_CAT_COLOR[e.category]||'#6366f1'}" title="${e.title}"></div>`).join('');
    cells+=`<div class="ac-cell${isToday?' ac-today':''}${isSel?' ac-selected':''}" onclick="acSelectDay('${iso}')"><div class="ac-day-num">${d}</div><div class="ac-dots">${dots}${evs.length>5?`<span style="font-size:10px;color:var(--text-2)">+${evs.length-5}</span>`:''}</div></div>`;
  }
  const rem=(firstDay+daysInMonth)%7;if(rem)for(let d=1;d<=7-rem;d++)cells+=`<div class="ac-cell ac-other-month"><div class="ac-day-num">${d}</div></div>`;
  document.getElementById('ac-grid').innerHTML=cells;
  renderACSummary();
}
function acSelectDay(iso){
  acSelectedDate=iso;renderACCalendar();
  const [y,m,d]=iso.split('-');
  document.getElementById('ac-sel-label').textContent=new Date(+y,+m-1,+d).toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('ac-add-day-btn').style.display='';
  const tasks=acEvents[iso]||[];
  if(!tasks.length){document.getElementById('ac-event-list').innerHTML='<div class="ac-no-events">No tasks for this day.<br><small style="color:var(--primary);cursor:pointer" onclick="openACModal(\''+iso+'\',null)">+ Add one</small></div>';return;}
  document.getElementById('ac-event-list').innerHTML=tasks.map(t=>{
    const dotColor=t.color||AC_CAT_COLOR[t.category]||'#6366f1';
    const priClass=`ac-badge-priority-${t.priority}`;
    return`<div class="ac-task-item">
      <div class="ac-task-top">
        <div class="ac-task-dot" style="background:${dotColor}"></div>
        <div class="ac-task-title">${t.title}</div>
        <div class="ac-task-actions">
          <button class="ac-task-edit" onclick="openACModal('${t.task_date}',${t.id})">Edit</button>
          <button class="ac-task-del" onclick="openACDelModal(${t.id},'${t.title.replace(/'/g,"\\'")}')">Del</button>
        </div>
      </div>
      <div class="ac-task-meta">
        <span class="ac-task-badge" style="background:${dotColor}22;color:${dotColor}">${t.category}</span>
        <span class="ac-task-badge ${priClass}">${t.priority}</span>
        <span class="ac-task-badge" style="background:#f1f5f9;color:#64748b">${t.status}</span>
      </div>
      ${t.description?`<div class="ac-task-desc">${t.description}</div>`:''}
    </div>`;
  }).join('');
}
// ── Summary ──────────────────────────────────────────────────
function renderACSummary(){
  const monthTasks=acTasksData.filter(t=>{
    const d=new Date(t.task_date);
    return d.getFullYear()===acYear&&d.getMonth()===acMonth;
  });
  document.getElementById('acs-total').textContent=monthTasks.length;
  document.getElementById('acs-pending').textContent=monthTasks.filter(t=>t.status==='Pending').length;
  document.getElementById('acs-inprogress').textContent=monthTasks.filter(t=>t.status==='In Progress').length;
  document.getElementById('acs-done').textContent=monthTasks.filter(t=>t.status==='Done').length;
  document.getElementById('acs-cancelled').textContent=monthTasks.filter(t=>t.status==='Cancelled').length;
  const q=(document.getElementById('acs-search')?document.getElementById('acs-search').value||'':'').toLowerCase();
  const rows=monthTasks.filter(t=>!q||t.title.toLowerCase().includes(q)||t.category.toLowerCase().includes(q)||(t.description||'').toLowerCase().includes(q));
  const STATUS_COLOR={Pending:'#f1f5f9|#64748b','In Progress':'#eff6ff|#3b82f6',Done:'#f0fdf4|#16a34a',Cancelled:'#fef2f2|#ef4444'};
  const PRI_COLOR={High:'#fef2f2|#ef4444',Medium:'#fffbeb|#d97706',Low:'#f0fdf4|#16a34a'};
  document.getElementById('acs-body').innerHTML=rows.length?rows.map((t,i)=>{
    const dotColor=t.color||AC_CAT_COLOR[t.category]||'#6366f1';
    const [sBg,sFg]=(STATUS_COLOR[t.status]||'#f1f5f9|#64748b').split('|');
    const [pBg,pFg]=(PRI_COLOR[t.priority]||'#f1f5f9|#64748b').split('|');
    return`<tr>
      <td>${i+1}</td>
      <td style="white-space:nowrap">${t.task_date}</td>
      <td><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;flex-shrink:0"></span><strong>${t.title}</strong></span></td>
      <td><span style="background:${dotColor}22;color:${dotColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${t.category}</span></td>
      <td><span style="background:${pBg};color:${pFg};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${t.priority}</span></td>
      <td><span style="background:${sBg};color:${sFg};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${t.status}</span></td>
      <td style="max-width:200px;color:var(--text-2)">${t.description||'—'}</td>
      <td>
        <button class="ac-sum-act ac-sum-edit" onclick="openACModal('${t.task_date}',${t.id})">Edit</button>
        <button class="ac-sum-act ac-sum-del" onclick="openACDelModal(${t.id},'${t.title.replace(/'/g,"\\'")}')">Del</button>
      </td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" class="ac-sum-empty">No tasks this month.</td></tr>';
}
// ── Modal ──────────────────────────────────────────────────────
function acPickColor(el){document.querySelectorAll('.ac-color-swatch').forEach(s=>s.classList.remove('selected'));el.classList.add('selected');acPickedColor=el.dataset.color;}
function openACModal(date,id){
  acEditId=id;
  const r=id?acTasksData.find(t=>t.id===id):null;
  document.getElementById('ac-task-modal-title').textContent=id?'Edit Task':'Add Task';
  document.getElementById('ac-f-date').value=r?r.task_date:(date||today());
  document.getElementById('ac-f-title').value=r?r.title:'';
  document.getElementById('ac-f-category').value=r?r.category:'General';
  document.getElementById('ac-f-priority').value=r?r.priority:'Medium';
  document.getElementById('ac-f-status').value=r?r.status:'Pending';
  document.getElementById('ac-f-desc').value=r?r.description:'';
  acPickedColor=r?r.color:'#6366f1';
  document.querySelectorAll('.ac-color-swatch').forEach(s=>{s.classList.toggle('selected',s.dataset.color===acPickedColor);});
  document.getElementById('ac-task-modal').classList.add('open');
}
function closeACModal(){document.getElementById('ac-task-modal').classList.remove('open');}
async function saveACTask(){
  const date=document.getElementById('ac-f-date').value;
  const title=document.getElementById('ac-f-title').value.trim();
  if(!date||!title){gToast('Date and title are required.','error');return;}
  const body={task_date:date,title,description:document.getElementById('ac-f-desc').value.trim(),category:document.getElementById('ac-f-category').value,priority:document.getElementById('ac-f-priority').value,status:document.getElementById('ac-f-status').value,color:acPickedColor};
  try{
    const url=acEditId?`${API}/calendar/tasks/${acEditId}`:API+'/calendar/tasks';
    const res=await fetch(url,{method:acEditId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!res.ok){
      const ct=res.headers.get('content-type')||'';
      const msg=ct.includes('json')?(await res.json().catch(()=>({}))).error||'Save failed':'Backend error - please restart the server.';
      throw new Error(msg);
    }
    gToast(acEditId?'Task updated!':'Task added!');
    closeACModal();
    await loadACEvents();
    if(date)acSelectDay(date);
    // Auto-notify LINE for High priority tasks
    if(body.priority==='High') await lineAutoNotify(body);
  }catch(err){gToast(err.message,'error');}
}
function openACDelModal(id,title){acDeleteId=id;document.getElementById('ac-del-name').textContent='"'+title+'"';document.getElementById('ac-del-modal').classList.add('open');}
function closeACDelModal(){document.getElementById('ac-del-modal').classList.remove('open');}
async function confirmDeleteACTask(){
  try{
    const t=acTasksData.find(x=>x.id===acDeleteId);
    await fetch(API+'/calendar/tasks/'+acDeleteId,{method:'DELETE'});
    gToast('Task deleted.');closeACDelModal();
    await loadACEvents();
    if(t&&acSelectedDate===t.task_date)acSelectDay(t.task_date);
  }catch{gToast('Delete failed.','error');}
}

// ── TASK NOTIFICATIONS ──────────────────────────────────────
let acNotifOpen = true;

function acToggleNotif(){
  acNotifOpen = !acNotifOpen;
  const list = document.getElementById('ac-notif-list');
  const btn  = document.querySelector('.ac-notif-toggle');
  list.style.display = acNotifOpen ? '' : 'none';
  btn.innerHTML = acNotifOpen ? '&#9660; Hide' : '&#9650; Show';
}

function loadACNotifications(){
  const todayStr = today();
  const urgent = [];

  acTasksData.forEach(t => {
    if(t.status === 'Done' || t.status === 'Cancelled') return;
    const isOverdue = t.task_date < todayStr;
    const isToday   = t.task_date === todayStr;
    const isHigh    = t.priority === 'High';

    if(isOverdue){
      urgent.push({task:t, type:'overdue', icon:'&#9940;', label:'Overdue', tagBg:'#fff0e8', tagFg:'#f97316'});
    } else if(isToday && isHigh){
      urgent.push({task:t, type:'urgent', icon:'&#128680;', label:'Due Today · High', tagBg:'#fef2f2', tagFg:'#ef4444'});
    } else if(isToday){
      urgent.push({task:t, type:'today', icon:'&#128203;', label:'Due Today', tagBg:'#fffbeb', tagFg:'#d97706'});
    } else if(isHigh){
      urgent.push({task:t, type:'urgent', icon:'&#128680;', label:'High Priority', tagBg:'#fef2f2', tagFg:'#ef4444'});
    }
  });

  const bar   = document.getElementById('ac-notif-bar');
  const list  = document.getElementById('ac-notif-list');
  const badge = document.getElementById('ac-urgent-badge');
  const count = document.getElementById('ac-notif-count');

  if(!urgent.length){
    bar.classList.remove('has-alerts');
    badge.style.display = 'none';
    return;
  }

  bar.classList.add('has-alerts');
  badge.style.display = '';
  count.textContent = urgent.length;

  if(acNotifOpen){
    list.innerHTML = urgent.map(item => `
      <div class="ac-notif-item ac-notif-${item.type}">
        <span class="ac-notif-icon">${item.icon}</span>
        <div class="ac-notif-body">
          <div class="ac-notif-title">${item.task.title}</div>
          <div class="ac-notif-meta">
            <span class="ac-notif-tag" style="background:${item.tagBg};color:${item.tagFg}">${item.label}</span>
            <span>&#128197; ${item.task.task_date}</span>
            <span>${item.task.category}</span>
          </div>
        </div>
      </div>`).join('');
  }
}

function acGoToTask(date){
  const [y,m] = date.split('-');
  acYear  = +y;
  acMonth = +m - 1;
  renderACCalendar();
  acSelectDay(date);
  document.getElementById('page-activitycalendar').scrollIntoView({behavior:'smooth'});
}


// ── USER ACCOUNTS ────────────────────────────────────────────
let editingUserId = null;

async function loadUsers() {
  const list = document.getElementById('users-list');
  const countLabel = document.getElementById('ua-count-label');
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    if (!users.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-2);padding:24px;font-size:13px">No accounts found.</div>';
      countLabel.textContent = '';
      return;
    }
    const active = users.filter(u => u.status === 'Active').length;
    countLabel.textContent = `${users.length} account${users.length!==1?'s':''} · ${active} active`;
    const roleColors = { Admin:'#6366f1', Manager:'#0ea5e9', Staff:'#64748b' };
    const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
    list.innerHTML = users.map((u, i) => {
      const initials = u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      const avatarColor = avatarColors[i % avatarColors.length];
      const roleColor = roleColors[u.role] || '#64748b';
      const isActive = u.status === 'Active';
      const escaped = JSON.stringify(u).replace(/"/g,'&quot;');
      return `
      <div class="ua-row">
        <div class="ua-avatar" style="background:${avatarColor}">${initials}</div>
        <div class="ua-info">
          <div class="ua-name">${u.name}</div>
          <div class="ua-email">${u.email}</div>
        </div>
        <div class="ua-badges">
          <span class="ua-badge-role" style="background:${roleColor}1a;color:${roleColor}">${u.role}</span>
          <span class="ua-badge-status" style="background:${isActive?'#10b9811a':'#ef44441a'};color:${isActive?'#10b981':'#ef4444'}">
            ${isActive?'&#9679; Active':'&#9675; Inactive'}
          </span>
        </div>
        <div class="ua-actions">
          <button class="ua-btn ua-btn-edit" onclick="openUserModal(${escaped})">✏ Edit</button>
          <button class="ua-btn ua-btn-del" onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">✕ Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = '<div style="text-align:center;color:var(--danger);padding:24px;font-size:13px">Failed to load accounts.</div>';
  }
}

function openUserModal(user) {
  editingUserId = user ? user.id : null;
  document.getElementById('user-modal-title').textContent = user ? 'Edit User' : 'Add User';
  document.getElementById('u-id').value = user ? user.id : '';
  document.getElementById('u-name').value = user ? user.name : '';
  document.getElementById('u-email').value = user ? user.email : '';
  document.getElementById('u-role').value = user ? user.role : 'Staff';
  document.getElementById('u-status').value = user ? user.status : 'Active';
  document.getElementById('u-password').value = '';
  const isEdit = !!user;
  document.getElementById('u-pass-label').innerHTML = isEdit
    ? 'New Password' : 'Password <span style="color:var(--danger)">*</span>';
  document.getElementById('u-pass-hint').style.display = isEdit ? 'block' : 'none';
  document.getElementById('user-modal').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
}

async function saveUser() {
  const id = document.getElementById('u-id').value;
  const name = document.getElementById('u-name').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const role = document.getElementById('u-role').value;
  const status = document.getElementById('u-status').value;
  const password = document.getElementById('u-password').value.trim();

  if (!name || !email) { gToast('Name and email are required.','error'); return; }
  if (!id && !password) { gToast('Password is required for new users.','error'); return; }

  try {
    const url = id ? `/api/users/${id}` : '/api/users';
    const method = id ? 'PUT' : 'POST';
    const body = { name, email, role, status };
    if (password) body.password = password;

    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { gToast(data.error || 'Failed to save user.','error'); return; }

    gToast(id ? 'User updated successfully!' : 'User added successfully!');
    closeUserModal();
    loadUsers();
  } catch(e) {
    gToast('Server error. Please try again.','error');
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method:'DELETE' });
    const data = await res.json();
    if (!res.ok) { gToast(data.error || 'Failed to delete user.','error'); return; }
    gToast(`User "${name}" deleted.`);
    loadUsers();
  } catch(e) {
    gToast('Server error. Please try again.','error');
  }
}

// LINE NOTIFICATIONS
let lineConfigured = false;

async function sendLineNotification(){
  if(!lineConfigured){gToast('LINE not connected. Configure it in Settings.','error');return;}
  const urgentTasks=acTasksData.filter(t=>{
    const today=new Date().toISOString().slice(0,10);
    return t.status!=='Done'&&(t.task_date<=today||t.priority==='High');
  });
  if(!urgentTasks.length){gToast('No urgent tasks to notify.','info');return;}
  try{
    const btn=document.getElementById('line-notif-btn');
    if(btn){btn.disabled=true;btn.textContent='Sending...';}
    const r=await fetch(API+'/line/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:urgentTasks})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Broadcast failed');
    gToast('LINE broadcast sent to all friends! ('+d.sent+' task'+(d.sent===1?'':'s')+')');
  }catch(err){gToast(err.message,'error');}
  finally{const btn=document.getElementById('line-notif-btn');if(btn){btn.disabled=false;btn.innerHTML='<img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" style="width:14px;height:14px;filter:brightness(0) invert(1)" alt="LINE"/> Notify via LINE';}}
}

async function lineAutoNotify(task){
  try{
    const cfg=await fetch(API+'/line/config').then(r=>r.json());
    if(!cfg.token_set||!cfg.auto_notify)return;
    await fetch(API+'/line/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:[task]})});
  }catch{}
}

async function loadLineConfig(){
  try{
    const r=await fetch(API+'/line/config');
    if(!r.ok)return;
    const cfg=await r.json();
    lineConfigured=cfg.token_set; // broadcast mode — no user_id required
    const uid=document.getElementById('line-userid');
    if(uid)uid.value=cfg.user_id||'';
    const auto=document.getElementById('line-auto');
    if(auto)auto.checked=!!cfg.auto_notify;
    const st=document.getElementById('line-conn-status');
    if(st){st.textContent=lineConfigured?'● Connected':'● Not Connected';st.className='line-status '+(lineConfigured?'connected':'disconnected');}
  }catch{}
}
function lineToggleToken(){const inp=document.getElementById('line-token');const btn=document.querySelector('.line-token-show');if(inp.type==='password'){inp.type='text';btn.textContent='Hide';}else{inp.type='password';btn.textContent='Show';}}
async function saveLineConfig(){
  const token=document.getElementById('line-token').value.trim();
  const uid=document.getElementById('line-userid').value.trim();
  const auto=document.getElementById('line-auto').checked;
  if(!token){gToast('Channel Access Token is required.','error');return;}
  try{
    const r=await fetch(API+'/line/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel_token:token,user_id:uid,auto_notify:auto})});
    if(!r.ok){const e=await r.json();throw new Error(e.error||'Save failed');}
    gToast('LINE config saved!');await loadLineConfig();
  }catch(err){gToast(err.message,'error');}
}
async function testLineNotify(){
  try{
    const r=await fetch(API+'/line/test',{method:'POST'});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Test failed');
    gToast(d.message||'Test broadcast sent!');
  }catch(err){gToast(err.message,'error');}
}

/* ===== SPARE PARTS MONITORING - SPM NAV TOGGLE ===== */
function toggleSPMGroup(el){
  const grp=el.nextElementSibling;
  if(!grp)return;
  const isOpen=grp.style.display!=='none';
  grp.style.display=isOpen?'none':'block';
  const chev=el.querySelector('.spm-chevron');
  if(chev)chev.style.transform=isOpen?'rotate(0deg)':'rotate(180deg)';
}

