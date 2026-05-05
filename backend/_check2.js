</script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="/ua.js?v=3"></script>
<style>
:root{--sidebar-bg:#16123a;--sidebar-text:#a5b4fc;--sidebar-hover:#1e1a4a;--sidebar-active:rgba(129,140,248,0.18);--primary:#6366f1;--primary-light:#818cf8;--bg:#f1f5f9;--bg-card:#ffffff;--text:#1e293b;--text-2:#64748b;--border:#e2e8f0;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);display:flex;height:100vh;overflow:hidden;}
/* SIDEBAR */
.sidebar{width:240px;min-width:240px;background:var(--sidebar-bg);display:flex;flex-direction:column;height:100vh;overflow:hidden;}
.sidebar-brand{padding:20px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.08);}
.brand-icon{font-size:26px;}
.brand-text{display:flex;flex-direction:column;}
.brand-name{font-size:15px;font-weight:700;color:#fff;}
.brand-sub{font-size:11px;color:var(--sidebar-text);}
.sidebar-nav{flex:1;padding:12px 8px;overflow-y:auto;}
.nav-label{font-size:10px;font-weight:700;letter-spacing:1px;color:rgba(165,180,252,.5);text-transform:uppercase;padding:14px 8px 6px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;color:var(--sidebar-text);font-size:13px;font-weight:500;transition:background .15s,color .15s;position:relative;}
.nav-item:hover{background:var(--sidebar-hover);color:#c7d2fe;}
.nav-item.active{background:var(--sidebar-active);color:#fff;}
.nav-item svg{width:17px;height:17px;fill:currentColor;flex-shrink:0;}
.nav-badge{margin-left:auto;background:var(--danger);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center;}
.nav-group-header:hover{background:var(--sidebar-hover);color:#c7d2fe;}
.nav-sub-item{border-left:2px solid rgba(165,180,252,.25);margin-left:6px;}
.nav-sub-item.active{background:var(--sidebar-active);color:#fff;border-left-color:#818cf8;}
.nav-sub-item:hover{background:var(--sidebar-hover);color:#c7d2fe;}
.spm-group{transition:max-height .25s ease;}
.sidebar-user{padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;}
.user-avatar{width:34px;height:34px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;}
.user-name{font-size:12px;font-weight:600;color:#fff;}
.user-role{font-size:10px;color:var(--sidebar-text);}
.logout-btn{margin-left:auto;background:rgba(239,68,68,.15);border:none;color:#f87171;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:11px;font-weight:600;}
.logout-btn:hover{background:rgba(239,68,68,.28);}
/* MAIN */
main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.topbar{height:56px;background:var(--bg-card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:16px;flex-shrink:0;}
.topbar-title{font-size:16px;font-weight:700;color:var(--text);}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-2);}
.content{flex:1;overflow-y:auto;padding:24px;}
/* PAGE SECTIONS */
.page-section{display:none;}
.page-section.active{display:block;}
/* SECTION LABELS */
.section-label{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-2);margin-bottom:14px;margin-top:22px;}
.section-label:first-child{margin-top:0;}
/* KPI CARDS */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:22px;}
.kpi-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:6px;}
.kpi-label{font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;}
.kpi-value{font-size:26px;font-weight:800;color:var(--text);}
.kpi-sub{font-size:11px;color:var(--text-2);}
.sm-kpi-card{flex-direction:row;align-items:center;gap:14px;}
.sm-kpi-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
/* CHARTS */
.charts-row{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:22px;}
.chart-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:18px;}
.chart-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;}
/* TABLES */
.page-tbl-wrap{overflow-x:auto;}
.page-table{width:100%;border-collapse:collapse;font-size:13px;}
.page-table th{background:var(--sidebar-bg);color:#fff;padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.4px;white-space:nowrap;}
.page-table td{padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:middle;}
.page-table tr:hover td{background:#f8fafc;}
.page-table tfoot td{background:var(--sidebar-bg);color:#fff;font-weight:700;padding:10px 14px;}
.no-results{text-align:center;color:var(--text-2);padding:30px;font-size:13px;}
/* TABLE TOOLBAR */
.page-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
.search-input{padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;background:var(--bg-card);color:var(--text);min-width:180px;}
.search-input:focus{border-color:var(--primary);}
.table-meta{font-size:12px;color:var(--text-2);}
.page-add-btn{display:flex;align-items:center;gap:6px;background:var(--primary);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;margin-left:auto;}
.page-add-btn:hover{background:var(--primary-light);}
.page-act-btn{font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;border:none;cursor:pointer;margin-right:4px;}
.btn-edit{background:#e0e7ff;color:#4338ca;}
.btn-edit:hover{background:#c7d2fe;}
.btn-del{background:#fee2e2;color:#dc2626;}
.btn-del:hover{background:#fecaca;}
/* BADGES */
.badge-instock,.badge-active{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;}
.badge-lowstock{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;}
.badge-outofstock{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fee2e2;color:#991b1b;}
.badge-pending{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;}
.badge-approved{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;}
.badge-ordered{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af;}
.badge-received,.badge-completed,.badge-delivered{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;}
.badge-cancelled{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fee2e2;color:#991b1b;}
.badge-inactive{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#f1f5f9;color:#64748b;}
.badge-scheduled{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#e0e7ff;color:#3730a3;}
.badge-inprogress,.badge-in-progress{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;}
.badge-delivery{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af;}
.badge-pullout{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#ede9fe;color:#5b21b6;}
/* MODALS */
.g-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;align-items:center;justify-content:center;}
.g-modal-overlay.open{display:flex;}
.g-modal{background:var(--bg-card);border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);}
.g-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);font-size:15px;font-weight:700;color:var(--text);}
.g-modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-2);line-height:1;}
.g-modal-body{padding:20px;}
.g-modal-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--border);}
.g-form-group{margin-bottom:14px;}
.g-form-group label{display:block;font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:5px;}
.g-form-group input,.g-form-group select,.g-form-group textarea{width:100%;padding:8px 11px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--bg-card);outline:none;}
.g-form-group input:focus,.g-form-group select:focus,.g-form-group textarea:focus{border-color:var(--primary);}
.g-btn{padding:8px 18px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;}
.g-btn-cancel{background:var(--bg);color:var(--text-2);}
.g-btn-save{background:var(--primary);color:#fff;}
.g-btn-save:hover{background:var(--primary-light);}
.g-btn-delete{background:var(--danger);color:#fff;}
/* TOAST */
.toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
.toast{padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideIn .3s ease;}
.toast.success{background:#10b981;}
.toast.error{background:#ef4444;}
.toast.info{background:#6366f1;}
@keyframes slideIn{from{transform:translateX(60px);opacity:0;}to{transform:translateX(0);opacity:1;}}
/* LOGISTICS TABS */
.log-tabs{display:flex;gap:8px;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:0;}
.log-tab{padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--text-2);border-bottom:2px solid transparent;margin-bottom:-2px;}
.log-tab.active{color:var(--primary);border-bottom-color:var(--primary);}
.log-panel{display:none;}
.log-panel.active{display:block;}
/* FILE LINK */
.file-link{color:var(--primary);text-decoration:none;font-size:12px;}
.file-link:hover{text-decoration:underline;}
/* SETTINGS CARD */
.settings-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;}
.settings-card h3{font-size:14px;font-weight:700;margin-bottom:14px;color:var(--text);}
/* USER ACCOUNTS */
.ua-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.ua-header h3{margin:0;font-size:15px;font-weight:700;color:var(--text);}
.ua-header .ua-count{font-size:12px;color:var(--text-2);font-weight:500;margin-top:2px;}
.ua-add-btn{display:flex;align-items:center;gap:6px;background:var(--primary);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
.ua-add-btn:hover{background:var(--primary-light);}
.ua-list{display:flex;flex-direction:column;gap:10px;}
.ua-row{display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg);transition:box-shadow .15s;}
.ua-row:hover{box-shadow:0 2px 12px rgba(99,102,241,.1);border-color:var(--primary-light);}
.ua-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}
.ua-info{flex:1;min-width:0;}
.ua-name{font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ua-email{font-size:11px;color:var(--text-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ua-badges{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.ua-badge-role{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.ua-badge-status{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.ua-actions{display:flex;gap:6px;flex-shrink:0;}
.ua-btn{border:none;border-radius:7px;padding:6px 13px;font-size:11px;font-weight:700;cursor:pointer;transition:opacity .15s;}
.ua-btn:hover{opacity:.82;}
.ua-btn-edit{background:#6366f11a;color:var(--primary);}
.ua-btn-del{background:#ef44441a;color:var(--danger);}
/* ALERT CARDS */
.alert-section{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;overflow:hidden;}
.alert-section-head{background:var(--sidebar-bg);color:#fff;padding:12px 16px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;}
.alert-head-red   {background:#7f1d1d;}
.alert-head-amber {background:#78350f;}
.alert-head-blue  {background:#1e3a5f;}
.alert-head-count{font-size:11px;padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.18);color:#fff;font-weight:700;margin-left:auto;}
.alert-empty{text-align:center;color:var(--text-2);padding:24px;font-size:13px;}
/* MM Table */
.mm-table{width:100%;border-collapse:collapse;font-size:12px;}
.mm-table th{background:var(--sidebar-bg);color:#fff;padding:8px 12px;text-align:center;font-size:11px;white-space:nowrap;}
.mm-table th:first-child{text-align:left;}
.mm-table td{padding:8px 12px;border-bottom:1px solid var(--border);text-align:center;}
.mm-table td:first-child{text-align:left;font-weight:600;}
.mm-table tr:hover td{background:#f8fafc;}
.mm-group-header td{background:var(--sidebar-hover);color:var(--sidebar-text);font-size:11px;font-weight:700;letter-spacing:.5px;text-align:left!important;padding:6px 12px;}
.mm-area-header td{background:rgba(99,102,241,.1);color:var(--primary);font-weight:700;font-size:12px;}
/* CALENDAR */
.ac-wrapper{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;}
.ac-cal-card{flex:1;min-width:320px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;}
.ac-cal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--sidebar-bg);color:#fff;}
.ac-cal-title{font-size:15px;font-weight:600;}
.ac-nav-btn{background:rgba(255,255,255,.12);border:none;border-radius:8px;color:#fff;width:30px;height:30px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;}
.ac-nav-btn:hover{background:rgba(255,255,255,.25);}
.ac-today-btn{background:rgba(255,255,255,.12);border:none;border-radius:8px;color:#fff;padding:0 10px;height:30px;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.5px;}
.ac-today-btn:hover{background:rgba(255,255,255,.25);}
.ac-dow-row{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border);}
.ac-dow{text-align:center;padding:7px 0;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;}
.ac-grid{display:grid;grid-template-columns:repeat(7,1fr);}
.ac-cell{min-height:72px;padding:5px 7px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;position:relative;}
.ac-cell:nth-child(7n){border-right:none;}
.ac-cell:hover{background:#f8fafc;}
.ac-cell.ac-today .ac-day-num{background:var(--sidebar-bg);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;}
.ac-cell.ac-other-month .ac-day-num{opacity:.35;}
.ac-cell.ac-selected{background:#eff6ff;}
.ac-cell.ac-selected .ac-day-num{color:var(--primary);font-weight:800;}
.ac-day-num{font-size:12px;font-weight:600;margin-bottom:3px;}
.ac-dots{display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;}
.ac-dot{width:7px;height:7px;border-radius:50%;}
.ac-side{width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:14px;}
.ac-legend-card,.ac-events-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;}
.ac-card-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.ac-add-btn{background:var(--primary);color:#fff;border:none;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;}
.ac-add-btn:hover{background:var(--primary-light);}
.ac-legend-item{display:flex;align-items:center;gap:9px;margin-bottom:7px;font-size:12px;color:var(--text);}
.ac-legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.ac-task-item{padding:9px 11px;border-radius:9px;background:var(--bg);border:1px solid var(--border);font-size:12px;margin-bottom:8px;position:relative;}
.ac-task-top{display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;}
.ac-task-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.ac-task-title{font-weight:700;color:var(--text);flex:1;line-height:1.3;}
.ac-task-actions{display:flex;gap:4px;flex-shrink:0;}
.ac-task-edit,.ac-task-del{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;border:none;cursor:pointer;}
.ac-task-edit{background:#eff6ff;color:var(--primary);}
.ac-task-edit:hover{background:#dbeafe;}
.ac-task-del{background:#fef2f2;color:var(--danger);}
.ac-task-del:hover{background:#fee2e2;}
.ac-task-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px;}
.ac-task-badge{font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;}
.ac-badge-priority-High{background:#fef2f2;color:#ef4444;}
.ac-badge-priority-Medium{background:#fffbeb;color:#d97706;}
.ac-badge-priority-Low{background:#f0fdf4;color:#16a34a;}
.ac-badge-status-Pending{background:#f1f5f9;color:#64748b;}
.ac-badge-status-In\ Progress{background:#eff6ff;color:#3b82f6;}
.ac-badge-status-Done{background:#f0fdf4;color:#16a34a;}
.ac-badge-status-Cancelled{background:#fef2f2;color:#ef4444;}
.ac-task-desc{font-size:11px;color:var(--text-2);margin-top:4px;line-height:1.4;}
.ac-no-events{text-align:center;color:var(--text-2);padding:16px 0;font-size:12px;}
.ac-color-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
.ac-color-swatch{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform .12s;}
.ac-color-swatch:hover{transform:scale(1.15);}
.ac-color-swatch.selected{border-color:#1e293b;transform:scale(1.2);}
.ac-filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.ac-filter-btn{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-2);cursor:pointer;}
.ac-filter-btn.active{background:var(--sidebar-bg);color:#fff;border-color:var(--sidebar-bg);}
/* CALENDAR SUMMARY */
.ac-summary{margin-top:22px;}
.ac-summary-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px;}
.ac-kpi{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;}
.ac-kpi-label{font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;}
.ac-kpi-value{font-size:26px;font-weight:800;color:var(--text);line-height:1;}
.ac-kpi-sub{font-size:11px;color:var(--text-2);}
.ac-kpi.kpi-pending .ac-kpi-value{color:#64748b;}
.ac-kpi.kpi-inprogress .ac-kpi-value{color:#3b82f6;}
.ac-kpi.kpi-done .ac-kpi-value{color:#10b981;}
.ac-kpi.kpi-cancelled .ac-kpi-value{color:#ef4444;}
.ac-summary-table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
.ac-summary-head{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--border);}
.ac-summary-title{font-size:13px;font-weight:700;color:var(--text);}
.ac-summary-search{padding:5px 10px;border:1px solid var(--border);border-radius:7px;font-size:12px;outline:none;width:180px;}
.ac-sum-tbl{width:100%;border-collapse:collapse;font-size:12px;}
.ac-sum-tbl th{background:var(--sidebar-bg);color:#fff;padding:9px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.4px;white-space:nowrap;}
.ac-sum-tbl td{padding:9px 14px;border-bottom:1px solid var(--border);vertical-align:middle;}
.ac-sum-tbl tr:last-child td{border-bottom:none;}
.ac-sum-tbl tr:hover td{background:#f8fafc;}
.ac-sum-act{font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;border:none;cursor:pointer;margin-right:3px;}
.ac-sum-edit{background:#eff6ff;color:var(--primary);}
.ac-sum-del{background:#fef2f2;color:var(--danger);}
.ac-sum-empty{text-align:center;padding:24px;color:var(--text-2);font-size:13px;}
/* LINE NOTIFY */
.line-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;margin-left:8px;}
.line-status.connected{background:#f0fdf4;color:#16a34a;}
.line-status.disconnected{background:#fef2f2;color:#ef4444;}
.line-token-wrap{position:relative;}
.line-token-wrap input{padding-right:70px;}
.line-token-show{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700;color:var(--primary);cursor:pointer;background:none;border:none;}
.line-notify-btn{display:flex;align-items:center;gap:6px;background:#06C755;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;}
.line-notify-btn:hover{background:#04a344;}
.line-notify-btn:disabled{background:#9ca3af;cursor:not-allowed;}
/* TASK NOTIFICATIONS */
.ac-notif-bar{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;overflow:hidden;display:none;}
.ac-notif-bar.has-alerts{display:block;}
.ac-notif-header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#7c2d12;color:#fff;}
.ac-notif-header-left{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;}
.ac-notif-header-icon{font-size:16px;}
.ac-notif-toggle{background:rgba(255,255,255,.15);border:none;border-radius:6px;color:#fff;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;}
.ac-notif-toggle:hover{background:rgba(255,255,255,.25);}
.ac-notif-list{padding:10px 14px;display:flex;flex-direction:column;gap:7px;}
.ac-notif-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border-left:4px solid transparent;background:var(--bg);}
.ac-notif-item.urgent{border-left-color:#ef4444;background:#fef9f9;}
.ac-notif-item.overdue{border-left-color:#f97316;background:#fff9f5;}
.ac-notif-item.today{border-left-color:#f59e0b;background:#fffdf5;}
.ac-notif-icon{font-size:16px;flex-shrink:0;}
.ac-notif-body{flex:1;}
.ac-notif-title{font-size:12px;font-weight:700;color:var(--text);}
.ac-notif-meta{font-size:11px;color:var(--text-2);margin-top:2px;}
.ac-notif-pill{font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;flex-shrink:0;}
.ac-notif-goto{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;border:none;background:#fff;color:var(--primary);cursor:pointer;border:1px solid var(--border);}
.ac-notif-goto:hover{background:#eff6ff;}
/* LOGIN */
.login-overlay{position:fixed;inset:0;background:#0f172a;display:flex;align-items:center;justify-content:center;z-index:9999;}
.login-box{background:var(--bg-card);border-radius:16px;padding:36px 32px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.4);}
.login-logo{text-align:center;margin-bottom:24px;}
.login-logo .icon{font-size:40px;}
.login-logo h1{font-size:20px;font-weight:800;color:var(--sidebar-bg);margin-top:8px;}
.login-logo p{font-size:12px;color:var(--text-2);}
.login-btn{width:100%;padding:11px;background:var(--sidebar-bg);color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;}
.login-btn:hover{background:#1e1a4a;}
.login-err{color:var(--danger);font-size:12px;text-align:center;margin-top:8px;min-height:18px;}
/* REPORT TOTALS */
.report-total-row td{background:var(--sidebar-bg);color:#fff;font-weight:700;}
/* SUPPLIER AVATAR */
.sup-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}
/* RESPONSIVE */
@media(max-width:900px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.charts-row{grid-template-columns:1fr;}}
@media(max-width:640px){.sidebar{display:none;}}
/* ── STAFF / VIEW-ONLY MODE ─────────────────────────────────────────────── */
/* Hide every add / edit / delete control when staff is logged in */
body.staff-mode .page-add-btn,
body.staff-mode .page-act-btn,
body.staff-mode .btn-edit,
body.staff-mode .btn-del,
body.staff-mode .ua-add-btn,
body.staff-mode .ua-btn,
body.staff-mode .ua-btn-edit,
body.staff-mode .ua-btn-del,
body.staff-mode .ac-add-btn,
body.staff-mode .ac-task-edit,
body.staff-mode .ac-task-del,
body.staff-mode .ac-sum-edit,
body.staff-mode .ac-sum-del,
body.staff-mode #sm-search ~ .page-add-btn,
body.staff-mode #lp-add-btn,
body.staff-mode #cat-add-btn,
body.staff-mode #gr-add-btn,
body.staff-mode #po-add-btn,
body.staff-mode #sup-add-btn,
body.staff-mode #st-add-btn { display:none !important; }
/* Staff topbar badge */
.staff-viewonly-badge {
  display:none;
  align-items:center;
  gap:5px;
  background:rgba(99,102,241,.12);
  color:#818cf8;
  border:1px solid rgba(99,102,241,.25);
  font-size:11px;
  font-weight:700;
  padding:4px 12px;
  border-radius:20px;
  letter-spacing:.3px;
  white-space:nowrap;
}
.staff-viewonly-badge.visible { display:flex; }
/* Staff access-denied screen (shown when a blocked page is attempted) */
.staff-blocked-notice {
  display:none;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  min-height:340px;
  gap:10px;
  color:var(--text-2);
}
.staff-blocked-notice.active { display:flex; }
.staff-blocked-icon { font-size:52px; }
.staff-blocked-title { font-size:17px; font-weight:700; color:var(--text); }
.staff-blocked-sub { font-size:13px; max-width:340px; text-align:center; line-height:1.6; }
</style>
</head>
<body>
<!-- LOGIN OVERLAY -->
<div class="login-overlay" id="login-overlay">
  <div class="login-box">
    <div class="login-logo">
      <div class="icon">📦</div>
      <h1>Inventory System</h1>
      <p>Management Dashboard</p>
    </div>
    <div class="g-form-group"><label>Username or Email</label><input id="l-user" placeholder="Enter username or email" autocomplete="username"/></div>
    <div class="g-form-group"><label>Password</label><input id="l-pass" type="password" placeholder="Enter password" autocomplete="current-password" onkeydown="if(event.key===&apos;Enter&apos;)doLogin()"/></div>
    <button class="login-btn" onclick="doLogin()">Sign In</button>
    <div class="login-err" id="login-err"></div>
  </div>
</div>
<!-- TOAST -->
<div class="toast-container" id="toast-container"></div>
<!-- SIDEBAR -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <span class="brand-icon">📦</span>
    <div class="brand-text"><div class="brand-name">Inventory</div><div class="brand-sub">Management System</div></div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-label">Main Menu</div>
    <div class="nav-item active" data-page="dashboard" onclick="showPage(&apos;dashboard&apos;)">
      <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg><span>Dashboard</span></div>
    <div class="nav-item" data-page="categories" onclick="showPage(&apos;categories&apos;)">
      <svg viewBox="0 0 24 24"><path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5S15.01 22 17.5 22 22 19.99 22 17.5 19.99 13 17.5 13zm0 7a2.5 2.5 0 010-5 2.5 2.5 0 010 5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/></svg><span>Categories</span></div>
    <!-- Spare Parts Monitoring Dropdown -->
    <div class="nav-item nav-group-header" onclick="toggleSPMGroup(this)" style="justify-content:space-between;user-select:none">
      <div style="display:flex;align-items:center;gap:10px">
        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:currentColor;flex-shrink:0"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
        <span>Spare Parts Monitoring</span>
      </div>
      <svg class="spm-chevron" viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;transition:transform .2s;flex-shrink:0"><path d="M7 10l5 5 5-5z"/></svg>
    </div>
    <div class="spm-group" style="display:block;padding-left:12px;overflow:hidden">
      <div class="nav-item nav-sub-item" data-page="stockmonitoring" onclick="showPage('stockmonitoring')" style="font-size:12.5px;padding:7px 10px">
        <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        <span>Stock Monitoring</span>
      </div>
      <div class="nav-item nav-sub-item" data-page="localpurchase" onclick="showPage('localpurchase')" style="font-size:12.5px;padding:7px 10px">
        <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0021.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
        <span>Local Purchase Monitoring</span>
      </div>
    </div>
    <div class="nav-item" data-page="machinemonitoring" onclick="showPage(&apos;machinemonitoring&apos;)">
      <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg><span>Machine Monitoring</span></div>
    <div class="nav-item" data-page="purchaseorders" onclick="showPage(&apos;purchaseorders&apos;)">
      <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8v-2zm0-4h8v2H8v-2z"/></svg><span>Purchase Orders</span></div>
    <div class="nav-item" data-page="suppliers" onclick="showPage(&apos;suppliers&apos;)">
      <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><span>Suppliers</span></div>
    <div class="nav-item" data-page="goodsreceived" onclick="showPage(&apos;goodsreceived&apos;)">
      <svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg><span>Goods Received</span></div>
    <div class="nav-item" data-page="stocktransfers" onclick="showPage(&apos;stocktransfers&apos;)">
      <svg viewBox="0 0 24 24"><path d="M17 4l4 4-4 4V9H3V7h14V4zm-4 13H3v-2h10v-3l4 4-4 4v-3z"/></svg><span>Stock Transfers</span></div>
    <div class="nav-label">Reports</div>
    <div class="nav-item" data-page="inventoryreport" onclick="showPage(&apos;inventoryreport&apos;)">
      <svg viewBox="0 0 24 24"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.1h-15V5h15v14.1zM20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg><span>Inventory Report</span></div>
    <div class="nav-item" data-page="purchasereport" onclick="showPage(&apos;purchasereport&apos;)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg><span>Purchase Report</span></div>
    <div class="nav-label">System</div>
    <div class="nav-item" data-page="logistics" onclick="showPage(&apos;logistics&apos;)">
      <svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg><span>Logistics</span></div>
    <div class="nav-item" data-page="alerts" onclick="showPage(&apos;alerts&apos;)">
      <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
      <span>Alerts</span><span class="nav-badge" id="alert-badge">0</span></div>
    <div class="nav-item" data-page="activitycalendar" onclick="showPage(&apos;activitycalendar&apos;)">
      <svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg><span>Activity Calendar</span><span class="nav-badge" id="ac-urgent-badge" style="display:none">0</span></div>
    <div class="nav-item" data-page="settings" onclick="showPage(&apos;settings&apos;)">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg><span>Settings</span></div>
  </nav>
  <div class="sidebar-user">
    <div class="user-avatar" id="user-avatar">RH</div>
    <div><div class="user-name" id="user-name">Rogen Hallarsis</div><div class="user-role" id="user-role">Administrator</div></div>
    <button class="logout-btn" onclick="doLogout()">Out</button>
  </div>
</aside>
<!-- MAIN -->
<main>
  <div class="topbar">
    <div class="topbar-title" id="topbar-title">Dashboard</div>
    <div class="topbar-right" id="topbar-right">
      <span class="staff-viewonly-badge" id="staff-viewonly-badge">
        <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
        View Only — Staff
      </span>
      <span id="topbar-date"></span>
    </div>
  </div>
  <div class="content">
<!-- ===== STAFF BLOCKED PAGE ===== -->
<div id="page-staff-blocked" class="page-section">
  <div class="staff-blocked-notice active">
    <div class="staff-blocked-icon">🔒</div>
    <div class="staff-blocked-title">Access Restricted</div>
    <div class="staff-blocked-sub">This section is only available to Administrators. Your account has <strong>Staff (View Only)</strong> privileges. Please contact your administrator if you need access.</div>
    <button class="g-btn g-btn-save" style="margin-top:8px" onclick="showPage('dashboard')">← Back to Dashboard</button>
  </div>
</div>
<!-- ===== DASHBOARD ===== -->
<div id="page-dashboard" class="page-section active">
  <div class="section-label">Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Total Items</div><div class="kpi-value" id="kpi-total">—</div><div class="kpi-sub">Products in inventory</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Value</div><div class="kpi-value" id="kpi-value">—</div><div class="kpi-sub">Inventory worth</div></div>
    <div class="kpi-card"><div class="kpi-label">Low Stock</div><div class="kpi-value" id="kpi-low">—</div><div class="kpi-sub">Items below threshold</div></div>
    <div class="kpi-card"><div class="kpi-label">Out of Stock</div><div class="kpi-value" id="kpi-out">—</div><div class="kpi-sub">Items at zero quantity</div></div>
  </div>
  <div class="section-label">Inventory Analytics</div>
  <div class="chart-card" style="margin-bottom:22px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div class="chart-title" style="margin:0">Machine Monitoring — Units Deployed per Site</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="mm-legend"></div>
    </div>
    <canvas id="mm-bar-chart" height="110"></canvas>
  </div>
  <div class="section-label">Inventory Items</div>
  <div class="page-toolbar">
    <input class="search-input" id="dash-search" placeholder="Search part name, number or machine..." oninput="renderDashTable()"/>
    <span class="table-meta" id="dash-meta"></span>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>Part Name</th><th>Part Number</th><th>Machine Use</th><th>On Hand</th><th>On Order</th><th>Order Now</th></tr></thead>
      <tbody id="dash-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== CATEGORIES ===== -->
<div id="page-categories" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="cat-search" placeholder="Search categories..." oninput="renderCat()"/>
    <span class="table-meta" id="cat-meta"></span>
    <button class="page-add-btn" onclick="openCatModal()">+ Add Category</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>Category Name</th><th>Specification</th><th>Item Count</th><th>Actions</th></tr></thead>
      <tbody id="cat-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== STOCK MONITORING ===== -->
<div id="page-stockmonitoring" class="page-section">
  <!-- KPI Cards -->
  <div class="kpi-grid" style="margin-bottom:18px">
    <div class="kpi-card sm-kpi-card">
      <div class="sm-kpi-icon" style="background:rgba(16,185,129,.12)">
        <svg viewBox="0 0 24 24" fill="#10b981" width="22" height="22"><text x="2" y="19" font-size="17" font-weight="900" font-family="Arial,sans-serif">₱</text></svg>
      </div>
      <div>
        <div class="kpi-label">In Stock Parts</div>
        <div class="kpi-value" id="sm-kpi-instock" style="font-size:22px">—</div>
        <div class="kpi-sub">Parts with sufficient quantity</div>
      </div>
    </div>
    <div class="kpi-card sm-kpi-card">
      <div class="sm-kpi-icon" style="background:rgba(245,158,11,.12)">
        <svg viewBox="0 0 24 24" fill="#f59e0b" width="22" height="22"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
      </div>
      <div>
        <div class="kpi-label">Low Stock Parts</div>
        <div class="kpi-value" id="sm-kpi-low" style="font-size:22px">—</div>
        <div class="kpi-sub">Parts below safety stock</div>
      </div>
    </div>
    <div class="kpi-card sm-kpi-card">
      <div class="sm-kpi-icon" style="background:rgba(239,68,68,.12)">
        <svg viewBox="0 0 24 24" fill="#ef4444" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      </div>
      <div>
        <div class="kpi-label">Out of Stock</div>
        <div class="kpi-value" id="sm-kpi-out" style="font-size:22px">—</div>
        <div class="kpi-sub">Parts at zero quantity</div>
      </div>
    </div>
    <div class="kpi-card sm-kpi-card">
      <div class="sm-kpi-icon" style="background:rgba(239,68,68,.12)">
        <svg viewBox="0 0 24 24" fill="#ef4444" width="22" height="22"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0021.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </div>
      <div>
        <div class="kpi-label">Order Now</div>
        <div class="kpi-value" id="sm-kpi-total" style="font-size:22px;color:#ef4444">—</div>
        <div class="kpi-sub">Parts requiring reorder</div>
      </div>
    </div>
  </div>
  <!-- Formula Banner -->
  <div id="sm-formula-banner" style="background:#1e3a5f;color:#bfdbfe;font-size:11.5px;padding:7px 14px;border-radius:7px;margin-bottom:12px;line-height:1.6;">
    <strong style="color:#93c5fd;">Auto-reorder formula:</strong>
    Reorder Point = Monthly Usage × (Lead Time + Buffer + Safety Stock Months).
    Buffer default = 3 months. &nbsp;|&nbsp;
    Net Available = On Hand + On Order. &nbsp;|&nbsp;
    Reorder Qty = Reorder Point − Net Available (when Net Available &lt; Reorder Point).
    <span style="float:right;opacity:.6;">(Generated <span id="sm-gen-date"></span>)</span>
  </div>
  <!-- Search & Table -->
  <div class="page-toolbar">
    <input class="search-input" id="sm-search" placeholder="Search spare parts..." oninput="renderSM()"/>
    <span class="table-meta" id="sm-meta"></span>
    <button class="page-add-btn" onclick="openSMModal()">+ Add Part</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr>
        <th>#</th>
        <th>Part Name</th>
        <th>Part Number</th>
        <th>Machine Use</th>
        <th>On Hand</th>
        <th>On Order</th>
        <th>Monthly Usage</th>
        <th>Lead Time (Months)</th>
        <th>Buffer (Months)</th>
        <th>Safety Stock (Months)</th>
        <th>Reorder Point (Units)</th>
        <th>Net Available (Units)</th>
        <th>Reorder Qty (Units)</th>
        <th>Order Now?</th>
        <th>Actions</th>
      </tr></thead>
      <tbody id="sm-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== LOCAL PURCHASE MONITORING ===== -->
<div id="page-localpurchase" class="page-section">
  <div class="kpi-grid" style="margin-bottom:18px">
    <div class="kpi-card"><div class="kpi-label">Total Records</div><div class="kpi-value" id="lp-kpi-total">—</div><div class="kpi-sub">All local purchases</div></div>
    <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-value" id="lp-kpi-pending" style="color:#f59e0b">—</div><div class="kpi-sub">Awaiting delivery</div></div>
    <div class="kpi-card"><div class="kpi-label">Received</div><div class="kpi-value" id="lp-kpi-received" style="color:#10b981">—</div><div class="kpi-sub">Completed orders</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Cost</div><div class="kpi-value" id="lp-kpi-cost" style="color:#6366f1">—</div><div class="kpi-sub">Aggregate amount</div></div>
  </div>
  <div class="page-toolbar">
    <input class="search-input" id="lp-search" placeholder="Search local purchases…" oninput="renderLP()"/>
    <select class="search-input" id="lp-filter" onchange="renderLP()" style="width:150px;padding:8px 10px">
      <option value="">All Status</option>
      <option value="Pending">Pending</option>
      <option value="Ordered">Ordered</option>
      <option value="Received">Received</option>
      <option value="Cancelled">Cancelled</option>
    </select>
    <span class="table-meta" id="lp-meta"></span>
    <button class="page-add-btn" onclick="openLPModal()">+ Add Purchase</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr>
        <th>#</th><th>PO / Reference No.</th><th>Part Name</th><th>Supplier</th>
        <th>Qty Ordered</th><th>Unit Price (₱)</th><th>Total (₱)</th>
        <th>Order Date</th><th>Expected Date</th><th>Status</th><th>Remarks</th><th>Actions</th>
      </tr></thead>
      <tbody id="lp-body"></tbody>
      <tfoot>
        <tr style="background:var(--sidebar-bg);border-top:2px solid var(--border)">
          <td colspan="6" style="padding:12px 16px;font-weight:700;font-size:13px">GRAND TOTAL</td>
          <td style="padding:12px 16px;font-weight:800;color:var(--primary);font-size:14px" id="lp-grand-total">₱0.00</td>
          <td colspan="5"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- ===== MACHINE MONITORING ===== -->
<div id="page-machinemonitoring" class="page-section">
  <div class="page-toolbar">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="log-tab active" id="mm-tab-all" onclick="filterMM(&apos;&apos;,this)">All Areas</button>
      <button class="log-tab" onclick="filterMM(&apos;Manila Area&apos;,this)">Manila Area</button>
      <button class="log-tab" onclick="filterMM(&apos;Pampanga Area&apos;,this)">Pampanga Area</button>
      <button class="log-tab" onclick="filterMM(&apos;Cebu Area&apos;,this)">Cebu Area</button>
    </div>
    <button class="page-add-btn" onclick="openMMModal()">+ Add Site</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="mm-table">
      <thead><tr><th>Site</th><th>EZ</th><th>BR</th><th>EZ2</th><th>EZL</th><th>LB</th><th>J-ARK</th><th>Total</th><th>Actions</th></tr></thead>
      <tbody id="mm-body"></tbody>
      <tfoot><tr><td><strong>TOTAL</strong></td><td id="mm-f-ez">0</td><td id="mm-f-br">0</td><td id="mm-f-ez2">0</td><td id="mm-f-ezl">0</td><td id="mm-f-lb">0</td><td id="mm-f-jark">0</td><td id="mm-f-total">0</td><td></td></tr></tfoot>
    </table>
  </div>
</div>
<!-- ===== PURCHASE ORDERS ===== -->
<div id="page-purchaseorders" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="po-search" placeholder="Search purchase orders..." oninput="renderPO()"/>
    <select class="search-input" id="po-filter" onchange="renderPO()" style="min-width:140px"><option value="">All Status</option><option>Pending</option><option>Approved</option><option>Ordered</option><option>Received</option><option>Cancelled</option></select>
    <span class="table-meta" id="po-meta"></span>
    <button class="page-add-btn" onclick="openPOModal()">+ Add PO</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>PO Number</th><th>Supplier</th><th>Order Date</th><th>Status</th><th>Total Amount</th><th>File</th><th>Actions</th></tr></thead>
      <tbody id="po-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== SUPPLIERS ===== -->
<div id="page-suppliers" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="sup-search" placeholder="Search suppliers..." oninput="renderSup()"/>
    <span class="table-meta" id="sup-meta"></span>
    <button class="page-add-btn" onclick="openSupModal()">+ Add Supplier</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>Supplier</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Category</th><th>Location</th><th>Status</th><th>2303</th><th>Actions</th></tr></thead>
      <tbody id="sup-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== GOODS RECEIVED ===== -->
<div id="page-goodsreceived" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="gr-search" placeholder="Search goods received..." oninput="renderGR()"/>
    <span class="table-meta" id="gr-meta"></span>
    <button class="page-add-btn" onclick="openGRModal()">+ Add GR</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>GR Number</th><th>PO Number</th><th>Supplier</th><th>Received Date</th><th>Received By</th><th>Total Items</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="gr-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== STOCK TRANSFERS ===== -->
<div id="page-stocktransfers" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="st-search" placeholder="Search transfers..." oninput="renderST()"/>
    <span class="table-meta" id="st-meta"></span>
    <button class="page-add-btn" onclick="openSTModal()">+ Add Transfer</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>Transfer No.</th><th>From</th><th>To</th><th>Date</th><th>Items</th><th>Status</th><th>Transferred By</th><th>Actions</th></tr></thead>
      <tbody id="st-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== INVENTORY REPORT ===== -->
<div id="page-inventoryreport" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="ir-search" placeholder="Search parts..." oninput="renderIR()"/>
    <span class="table-meta" id="ir-meta"></span>
    <button class="page-add-btn" onclick="exportIRExcel()" style="background:#10b981">⬇ Excel</button>
    <button class="page-add-btn" onclick="exportIRPdf()" style="background:#ef4444;margin-left:4px">⬇ PDF</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr>
        <th>#</th>
        <th>Part Name</th>
        <th>Part Number</th>
        <th>Machine Use</th>
        <th>On Hand</th>
        <th>On Order</th>
        <th>Monthly Usage</th>
        <th>Reorder Qty</th>
      </tr></thead>
      <tbody id="ir-body"></tbody>
    </table>
  </div>
</div>
<!-- ===== PURCHASE REPORT ===== -->
<div id="page-purchasereport" class="page-section">
  <div class="page-toolbar">
    <input class="search-input" id="pr-search" placeholder="Filter report..." oninput="renderPR()"/>
    <button class="page-add-btn" onclick="exportPRExcel()" style="background:#10b981">⬇ Excel</button>
    <button class="page-add-btn" onclick="exportPRPdf()" style="background:#ef4444;margin-left:4px">⬇ PDF</button>
  </div>
  <div class="page-tbl-wrap">
    <table class="page-table">
      <thead><tr><th>#</th><th>PO Number</th><th>Supplier</th><th>Order Date</th><th>Status</th><th>Total Amount</th></tr></thead>
      <tbody id="pr-body"></tbody>
      <tfoot><tr class="report-total-row"><td colspan="5"><strong>GRAND TOTAL</strong></td><td id="pr-f-total"></td></tr></tfoot>
    </table>
  </div>
</div>
<!-- ===== ALERTS ===== -->
<div id="page-alerts" class="page-section">
  <div class="alert-section">
    <div class="alert-section-head alert-head-red">🚫 Out of Stock <span class="alert-head-count" id="alert-out-count"></span></div>
    <div id="alert-outofstock"><div class="alert-empty">Loading...</div></div>
  </div>
  <div class="alert-section">
    <div class="alert-section-head alert-head-amber">⚠️ Low Stock (On Hand 1–10) <span class="alert-head-count" id="alert-low-count"></span></div>
    <div id="alert-lowstock"><div class="alert-empty">Loading...</div></div>
  </div>
  <div class="alert-section">
    <div class="alert-section-head alert-head-blue">🔵 Spare Parts — Order Now <span class="alert-head-count" id="alert-order-count"></span></div>
    <div id="alert-ordernow"><div class="alert-empty">Loading...</div></div>
  </div>
</div>
<!-- ===== LOGISTICS ===== -->
<div id="page-logistics" class="page-section">
  <div class="log-tabs">
    <button class="log-tab active" onclick="switchLogTab(&apos;trucking&apos;,this)">Trucking Quotations</button>
    <button class="log-tab" onclick="switchLogTab(&apos;manpower&apos;,this)">Manpower Requests</button>
    <button class="log-tab" onclick="switchLogTab(&apos;sites&apos;,this)">Sites Activity</button>
    <button class="log-tab" onclick="switchLogTab(&apos;waybills&apos;,this)">Waybills</button>
  </div>
  <!-- TRUCKING -->
  <div class="log-panel active" id="log-panel-trucking">
    <div class="page-toolbar">
      <input class="search-input" id="tq-search" placeholder="Search quotations..." oninput="renderTQ()"/>
      <span class="table-meta" id="tq-meta"></span>
      <button class="page-add-btn" onclick="openTQModal()">+ Add Quotation</button>
    </div>
    <div class="page-tbl-wrap"><table class="page-table">
      <thead><tr><th>#</th><th>Quote No.</th><th>Trucking Service</th><th>Date</th><th>Sites</th><th>Total Amount</th><th>Status</th><th>File</th><th>Actions</th></tr></thead>
      <tbody id="tq-body"></tbody>
    </table></div>
  </div>
  <!-- MANPOWER -->
  <div class="log-panel" id="log-panel-manpower">
    <div class="page-toolbar">
      <input class="search-input" id="mp-search" placeholder="Search requests..." oninput="renderMP()"/>
      <span class="table-meta" id="mp-meta"></span>
      <button class="page-add-btn" onclick="openMPModal()">+ Add Request</button>
    </div>
    <div class="page-tbl-wrap"><table class="page-table">
      <thead><tr><th>#</th><th>Request No.</th><th>Location</th><th>Machine Type</th><th>MP Qty</th><th>Unit Price</th><th>Total</th><th>Purpose</th><th>File</th><th>Actions</th></tr></thead>
      <tbody id="mp-body"></tbody>
      <tfoot><tr><td colspan="6" style="padding:10px 14px;font-weight:700">GRAND TOTAL</td><td id="mp-grand-total" style="padding:10px 14px;font-weight:800;color:var(--primary)">&#8369;0.00</td><td colspan="3"></td></tr></tfoot>
    </table></div>
  </div>
  <!-- SITES ACTIVITY -->
  <div class="log-panel" id="log-panel-sites">
    <div class="page-toolbar">
      <input class="search-input" id="sa-search" placeholder="Search sites..." oninput="renderSA()"/>
      <select class="search-input" id="sa-filter" onchange="renderSA()" style="min-width:130px"><option value="">All Types</option><option>Delivery</option><option>Pullout</option></select>
      <span class="table-meta" id="sa-meta"></span>
      <button class="page-add-btn" onclick="openSAModal()">+ Add Activity</button>
    </div>
    <div class="page-tbl-wrap"><table class="page-table">
      <thead><tr><th>#</th><th>Site Name</th><th>Type</th><th>Date</th><th>Location</th><th>Description</th><th>Status</th><th>File</th><th>Actions</th></tr></thead>
      <tbody id="sa-body"></tbody>
    </table></div>
  </div>
  <!-- WAYBILLS -->
  <div class="log-panel" id="log-panel-waybills">
    <div class="page-toolbar">
      <input class="search-input" id="wb-search" placeholder="Search waybills..." oninput="renderWB()"/>
      <span class="table-meta" id="wb-meta"></span>
      <button class="page-add-btn" onclick="openWBModal()">+ Add Waybill</button>
    </div>
    <div class="page-tbl-wrap"><table class="page-table">
      <thead><tr><th>#</th><th>Waybill No.</th><th>Date</th><th>Origin</th><th>Destination</th><th>Notes</th><th>File</th><th>Actions</th></tr></thead>
      <tbody id="wb-body"></tbody>
    </table></div>
  </div>
</div>
<!-- ===== ACTIVITY CALENDAR ===== -->
<div id="page-activitycalendar" class="page-section">
  <div class="section-label">Activity Calendar</div>

  <!-- Urgent Task Notifications -->
  <div class="ac-notif-bar" id="ac-notif-bar">
    <div class="ac-notif-header">
      <div class="ac-notif-header-left">
        <span class="ac-notif-header-icon">&#128680;</span>
        <span id="ac-notif-count">0 Urgent Tasks Require Attention</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="line-notify-btn" id="line-notif-btn" onclick="sendLineNotification()" title="Send LINE notification">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" style="width:14px;height:14px;filter:brightness(0) invert(1)" alt="LINE"/>
          Notify via LINE
        </button>
        <button class="ac-notif-toggle" onclick="acToggleNotif()">&#9660; Hide</button>
      </div>
    </div>
    <div class="ac-notif-list" id="ac-notif-list"></div>
  </div>

  <div class="page-toolbar" style="margin-bottom:14px">
    <div class="ac-filter-row" id="ac-filter-row">
      <button class="ac-filter-btn active" onclick="acSetFilter('',this)">All</button>
      <button class="ac-filter-btn" onclick="acSetFilter('Work',this)">Work</button>
      <button class="ac-filter-btn" onclick="acSetFilter('Meeting',this)">Meeting</button>
      <button class="ac-filter-btn" onclick="acSetFilter('Delivery',this)">Delivery</button>
      <button class="ac-filter-btn" onclick="acSetFilter('Maintenance',this)">Maintenance</button>
      <button class="ac-filter-btn" onclick="acSetFilter('Personal',this)">Personal</button>
      <button class="ac-filter-btn" onclick="acSetFilter('General',this)">General</button>
    </div>
    <button class="page-add-btn" onclick="openACModal(null,null)">+ Add Task</button>
  </div>
  <div class="ac-wrapper">
    <div class="ac-cal-card">
      <div class="ac-cal-header">
        <button class="ac-nav-btn" onclick="acChangeMonth(-1)">&#8249;</button>
        <span class="ac-cal-title" id="ac-month-title"></span>
        <button class="ac-nav-btn" onclick="acChangeMonth(1)">&#8250;</button>
        <button class="ac-today-btn" onclick="acGoToday()">Today</button>
      </div>
      <div class="ac-dow-row"><div class="ac-dow">Sun</div><div class="ac-dow">Mon</div><div class="ac-dow">Tue</div><div class="ac-dow">Wed</div><div class="ac-dow">Thu</div><div class="ac-dow">Fri</div><div class="ac-dow">Sat</div></div>
      <div class="ac-grid" id="ac-grid"></div>
    </div>
    <div class="ac-side">
      <div class="ac-events-card">
        <div class="ac-card-title">
          <span>&#128197; <span id="ac-sel-label">Select a day</span></span>
          <button class="ac-add-btn" id="ac-add-day-btn" style="display:none" onclick="openACModal(acSelectedDate,null)">+ Add</button>
        </div>
        <div id="ac-event-list"><div class="ac-no-events">Click a day to view tasks</div></div>
      </div>
      <div class="ac-legend-card">
        <div class="ac-card-title">Category Legend</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#6366f1"></div>Work</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#f59e0b"></div>Meeting</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#10b981"></div>Delivery</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#8b5cf6"></div>Maintenance</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#ec4899"></div>Personal</div>
        <div class="ac-legend-item"><div class="ac-legend-dot" style="background:#64748b"></div>General</div>
      </div>
    </div>
  </div>

  <!-- ── TASK SUMMARY ── -->
  <div class="ac-summary">
    <div class="section-label" style="margin-top:0;margin-bottom:14px">Task Summary — <span id="ac-summary-month">This Month</span></div>
    <div class="ac-summary-kpis">
      <div class="ac-kpi"><div class="ac-kpi-label">Total</div><div class="ac-kpi-value" id="acs-total">0</div><div class="ac-kpi-sub">Tasks this month</div></div>
      <div class="ac-kpi kpi-pending"><div class="ac-kpi-label">Pending</div><div class="ac-kpi-value" id="acs-pending">0</div><div class="ac-kpi-sub">Not started</div></div>
      <div class="ac-kpi kpi-inprogress"><div class="ac-kpi-label">In Progress</div><div class="ac-kpi-value" id="acs-inprogress">0</div><div class="ac-kpi-sub">Ongoing</div></div>
      <div class="ac-kpi kpi-done"><div class="ac-kpi-label">Done</div><div class="ac-kpi-value" id="acs-done">0</div><div class="ac-kpi-sub">Completed</div></div>
      <div class="ac-kpi kpi-cancelled"><div class="ac-kpi-label">Cancelled</div><div class="ac-kpi-value" id="acs-cancelled">0</div><div class="ac-kpi-sub">Cancelled</div></div>
    </div>
    <div class="ac-summary-table-wrap">
      <div class="ac-summary-head">
        <span class="ac-summary-title">&#128203; All Tasks This Month</span>
        <input class="ac-summary-search" id="acs-search" placeholder="Search tasks..." oninput="renderACSummary()"/>
      </div>
      <table class="ac-sum-tbl">
        <thead><tr>
          <th>#</th><th>Date</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Description</th><th>Actions</th>
        </tr></thead>
        <tbody id="acs-body"><tr><td colspan="8" class="ac-sum-empty">No tasks yet.</td></tr></tbody>
      </table>
    </div>
  </div>
</div>
<!-- ===== SETTINGS ===== -->
<div id="page-settings" class="page-section">
  <div class="section-label">User Profile</div>
  <div class="settings-card">
    <h3>Account Information</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="g-form-group"><label>Name</label><input id="set-name" readonly/></div>
      <div class="g-form-group"><label>Email</label><input id="set-email" readonly/></div>
      <div class="g-form-group"><label>Role</label><input id="set-role" readonly/></div>
    </div>
  </div>
  <div class="section-label">Application</div>
  <div class="settings-card">
    <h3>System Information</h3>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">Inventory Management System v1.0</p>
    <p style="font-size:12px;color:var(--text-2)">Backend: Node.js / Express &nbsp;|&nbsp; Database: SQLite (sql.js)</p>
  </div>
  <div class="section-label">User Accounts</div>
  <div class="settings-card">
    <div class="ua-header">
      <div>
        <h3>Manage Accounts</h3>
        <div class="ua-count" id="ua-count-label"></div>
      </div>
      <button class="ua-add-btn" onclick="openUserModal()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
        Add User
      </button>
    </div>
    <div class="ua-list" id="users-list"><div style="text-align:center;color:var(--text-2);padding:24px;font-size:13px">Loading…</div></div>
  </div>
  <div class="section-label">Notifications</div>
  <div class="settings-card">
    <h3 style="display:flex;align-items:center;gap:10px">
      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" style="width:22px;height:22px" alt="LINE"/>
      LINE Messaging Notifications
      <span class="line-status disconnected" id="line-conn-status">&#9679; Not Connected</span>
    </h3>
    <p style="font-size:12px;color:var(--text-2);margin-bottom:16px">
      Connect to LINE Messaging API to receive push notifications for urgent and overdue tasks directly in LINE.
      You need a <strong>Channel Access Token</strong> and your <strong>LINE User ID</strong> from the
      <a href="https://developers.line.biz/console/" target="_blank" style="color:var(--primary)">LINE Developers Console</a>.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="g-form-group" style="grid-column:1/-1">
        <label>Channel Access Token <span style="color:var(--danger)">*</span></label>
        <div class="line-token-wrap">
          <input type="password" id="line-token" placeholder="Paste your long-lived Channel Access Token"/>
          <button class="line-token-show" onclick="lineToggleToken()">Show</button>
        </div>
      </div>
      <div class="g-form-group">
        <label>LINE User ID <span style="color:var(--danger)">*</span></label>
        <input id="line-userid" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"/>
      </div>
      <div class="g-form-group" style="display:flex;align-items:flex-end">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600">
          <input type="checkbox" id="line-auto" style="width:16px;height:16px"/>
          Auto-notify on High priority task save
        </label>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button class="g-btn g-btn-save" onclick="saveLineConfig()">Save LINE Config</button>
      <button class="g-btn g-btn-cancel" onclick="testLineNotify()" id="line-test-btn">Send Test Message</button>
    </div>
    <p style="font-size:11px;color:var(--text-2);margin-top:10px">
      &#128161; How to get your User ID: Open LINE app &rarr; Settings &rarr; Profile &rarr; copy the ID shown below your name.
    </p>
  </div>
</div>
  </div><!-- end .content -->
</main>

<!-- USER ACCOUNT MODAL -->
<div class="g-modal-overlay" id="user-modal" onclick="if(event.target===this)closeUserModal()">
  <div class="g-modal" style="max-width:480px">
    <div class="g-modal-head">
      <span id="user-modal-title">Add User</span>
      <button class="g-modal-close" onclick="closeUserModal()">×</button>
    </div>
    <div class="g-modal-body">
      <input type="hidden" id="u-id"/>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="g-form-group" style="grid-column:1/-1">
          <label>Full Name <span style="color:var(--danger)">*</span></label>
          <input id="u-name" placeholder="e.g. Juan Dela Cruz"/>
        </div>
        <div class="g-form-group" style="grid-column:1/-1">
          <label>Email Address <span style="color:var(--danger)">*</span></label>
          <input id="u-email" type="email" placeholder="e.g. juan@company.com"/>
        </div>
        <div class="g-form-group">
          <label>Role <span style="color:var(--danger)">*</span></label>
          <select id="u-role">
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div class="g-form-group">
          <label>Status</label>
          <select id="u-status">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div class="g-form-group" style="grid-column:1/-1">
          <label id="u-pass-label">Password <span style="color:var(--danger)">*</span></label>
          <input id="u-password" type="password" placeholder="Enter password"/>
          <p id="u-pass-hint" style="font-size:11px;color:var(--text-2);margin-top:4px;display:none">Leave blank to keep the current password.</p>
        </div>
      </div>
    </div>
    <div class="g-modal-foot">
      <button class="g-btn g-btn-cancel" onclick="closeUserModal()">Cancel</button>
      <button class="g-btn g-btn-save" onclick="saveUser()">Save</button>
    </div>
  </div>
</div>

<!-- LOCAL PURCHASE MODAL -->
<div class="g-modal-overlay" id="lp-modal" onclick="if(event.target===this)closeLPModal()">
  <div class="g-modal" style="max-width:600px">
    <div class="g-modal-head"><span id="lp-modal-title">Add Local Purchase</span><button class="g-modal-close" onclick="closeLPModal()">×</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="g-form-group"><label>PO / Reference No. *</label><input id="lp-f-pono" placeholder="LP-2024-001"/></div>
        <div class="g-form-group"><label>Part Name *</label><input id="lp-f-part" placeholder="Spare part name"/></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="g-form-group"><label>Supplier</label><input id="lp-f-supplier" placeholder="Supplier name"/></div>
        <div class="g-form-group"><label>Status</label>
          <select id="lp-f-status"><option>Pending</option><option>Ordered</option><option>Received</option><option>Cancelled</option></select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
        <div class="g-form-group"><label>Qty Ordered</label><input type="number" id="lp-f-qty" value="1" min="1" oninput="calcLPTotal()"/></div>
        <div class="g-form-group"><label>Unit Price (₱)</label><input type="number" id="lp-f-uprice" value="0" min="0" step="0.01" oninput="calcLPTotal()"/></div>
        <div class="g-form-group"><label>Total (₱)</label><input id="lp-f-total" readonly style="background:#f1f5f9;font-weight:700;color:#6366f1"/></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="g-form-group"><label>Order Date</label><input type="date" id="lp-f-orderdate"/></div>
        <div class="g-form-group"><label>Expected Delivery</label><input type="date" id="lp-f-expdate"/></div>
      </div>
      <div class="g-form-group"><label>Remarks</label><textarea id="lp-f-remarks" rows="2" placeholder="Additional notes…"></textarea></div>
    </div>
    <div class="g-modal-foot">
      <button class="g-btn g-btn-cancel" onclick="closeLPModal()">Cancel</button>
      <button class="g-btn g-btn-save" onclick="saveLP()">Save</button>
    </div>
  </div>
</div>
<div class="g-modal-overlay" id="lp-del-modal" onclick="if(event.target===this)closeLPDelModal()">
  <div class="g-modal" style="max-width:420px">
    <div class="g-modal-head"><span>Delete Purchase</span><button class="g-modal-close" onclick="closeLPDelModal()">×</button></div>
    <div class="g-modal-body" style="text-align:center;padding:28px 24px">
      <div style="font-size:36px;margin-bottom:10px">🗑️</div>
      <p style="font-size:14px;color:#475569">Delete purchase record <strong id="lp-del-name"></strong>?</p>
      <p style="font-size:12px;color:#94a3b8">This action cannot be undone.</p>
    </div>
    <div class="g-modal-foot" style="justify-content:center">
      <button class="g-btn g-btn-cancel" onclick="closeLPDelModal()">Cancel</button>
      <button class="g-btn g-btn-delete" onclick="confirmDeleteLP()">Yes, Delete</button>
    </div>
  </div>
</div>
<!-- ===== MODALS ===== -->
<!-- INVENTORY ITEM MODAL (for dashboard add/edit) -->
<div class="g-modal-overlay" id="inv-modal">
  <div class="g-modal">
    <div class="g-modal-head"><span id="inv-modal-title">Add Item</span><button class="g-modal-close" onclick="closeInvModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Product Code *</label><input id="inv-f-code" placeholder="PRD-001"/></div>
        <div class="g-form-group"><label>Category *</label><input id="inv-f-cat" placeholder="Electronics"/></div>
      </div>
      <div class="g-form-group"><label>Name *</label><input id="inv-f-name" placeholder="Product name"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Quantity *</label><input type="number" id="inv-f-qty" min="0" placeholder="0"/></div>
        <div class="g-form-group"><label>Unit Price *</label><input type="number" id="inv-f-price" min="0" step="0.01" placeholder="0.00"/></div>
      </div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeInvModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveInv()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="inv-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Item</span><button class="g-modal-close" onclick="document.getElementById(&apos;inv-del-modal&apos;).classList.remove(&apos;open&apos;)">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><div style="font-size:36px">&#128465;&#65039;</div><p style="margin-top:10px;font-size:14px">Delete <strong id="inv-del-name"></strong>?</p><p style="font-size:12px;color:var(--text-2)">This cannot be undone.</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="document.getElementById(&apos;inv-del-modal&apos;).classList.remove(&apos;open&apos;)">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteInv()">Delete</button></div>
  </div>
</div>
<!-- CATEGORY MODALS -->
<div class="g-modal-overlay" id="cat-modal">
  <div class="g-modal">
    <div class="g-modal-head"><span id="cat-modal-title">Add Category</span><button class="g-modal-close" onclick="closeCatModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div class="g-form-group"><label>Category Name *</label><input id="cat-f-name" placeholder="e.g. Electronics"/></div>
      <div class="g-form-group"><label>Specification</label><textarea id="cat-f-spec" rows="3" placeholder="Description..."></textarea></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeCatModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveCat()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="cat-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Category</span><button class="g-modal-close" onclick="closeCatDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p style="font-size:14px">Delete <strong id="cat-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeCatDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteCat()">Delete</button></div>
  </div>
</div>
<!-- STOCK MONITORING MODALS -->
<div class="g-modal-overlay" id="sm-modal">
  <div class="g-modal" style="max-width:600px">
    <div class="g-modal-head"><span id="sm-modal-title">Add Spare Part</span><button class="g-modal-close" onclick="closeSMModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Name *</label><input id="sm-f-name" placeholder="Part name"/></div>
        <div class="g-form-group"><label>Part No. *</label><input id="sm-f-partno" placeholder="PN-001"/></div>
        <div class="g-form-group"><label>Machine</label><input id="sm-f-machine" placeholder="Machine name"/></div>
        <div class="g-form-group"><label>On Hand</label><input type="number" id="sm-f-onhand" min="0" value="0"/></div>
        <div class="g-form-group"><label>On Order</label><input type="number" id="sm-f-onorder" min="0" value="0"/></div>
        <div class="g-form-group"><label>Monthly Usage</label><input type="number" id="sm-f-usage" min="0" step="0.1" value="0"/></div>
        <div class="g-form-group"><label>Lead Time (days)</label><input type="number" id="sm-f-lead" min="0" step="0.1" value="0"/></div>
        <div class="g-form-group"><label>Buffer (months)</label><input type="number" id="sm-f-buffer" min="0" step="0.1" value="3"/></div>
        <div class="g-form-group"><label>Safety Stock</label><input type="number" id="sm-f-safety" min="0" step="0.1" value="1"/></div>
      </div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeSMModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveSM()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="sm-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Part</span><button class="g-modal-close" onclick="closeSMDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p style="font-size:14px">Delete <strong id="sm-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeSMDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteSM()">Delete</button></div>
  </div>
</div>
<!-- MACHINE MONITORING MODALS -->
<div class="g-modal-overlay" id="mm-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="mm-modal-title">Add Site</span><button class="g-modal-close" onclick="closeMMModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Site Name *</label><input id="mm-f-site" placeholder="Branch / Site name"/></div>
        <div class="g-form-group"><label>Area *</label><select id="mm-f-area" onchange="toggleMMGroup()"><option value="Manila Area">Manila Area</option><option value="Pampanga Area">Pampanga Area</option><option value="Cebu Area">Cebu Area</option></select></div>
        <div class="g-form-group" id="mm-group-row"><label>Group</label><select id="mm-f-group"><option value="Group 1">Group 1</option><option value="Group 2">Group 2</option></select></div>
        <div class="g-form-group"><label>EZ</label><input type="number" id="mm-f-ez" min="0" value="0"/></div>
        <div class="g-form-group"><label>BR</label><input type="number" id="mm-f-br" min="0" value="0"/></div>
        <div class="g-form-group"><label>EZ2</label><input type="number" id="mm-f-ez2" min="0" value="0"/></div>
        <div class="g-form-group"><label>EZL</label><input type="number" id="mm-f-ezl" min="0" value="0"/></div>
        <div class="g-form-group"><label>LB</label><input type="number" id="mm-f-lb" min="0" value="0"/></div>
        <div class="g-form-group"><label>J-ARK</label><input type="number" id="mm-f-jark" min="0" value="0"/></div>
      </div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeMMModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveMM()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="mm-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Site</span><button class="g-modal-close" onclick="closeMMDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p style="font-size:14px">Delete <strong id="mm-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeMMDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteMM()">Delete</button></div>
  </div>
</div>
<!-- PO MODALS -->
<div class="g-modal-overlay" id="po-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="po-modal-title">Add Purchase Order</span><button class="g-modal-close" onclick="closePOModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>PO Number *</label><input id="po-f-no" placeholder="PO-2024-001"/></div>
        <div class="g-form-group"><label>Supplier *</label><input id="po-f-supplier" placeholder="Supplier name"/></div>
        <div class="g-form-group"><label>Order Date</label><input type="date" id="po-f-date"/></div>
        <div class="g-form-group"><label>Status</label><select id="po-f-status"><option>Pending</option><option>Approved</option><option>Ordered</option><option>Received</option><option>Cancelled</option></select></div>
      </div>
      <div class="g-form-group"><label>Total Amount</label><input type="number" id="po-f-amount" min="0" step="0.01" placeholder="0.00"/></div>
      <div class="g-form-group"><label>Attach File</label><input type="file" id="po-f-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"/><div id="po-cur-file" style="font-size:11px;color:var(--text-2);margin-top:4px"></div></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closePOModal()">Cancel</button><button class="g-btn g-btn-save" onclick="savePO()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="po-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete PO</span><button class="g-modal-close" onclick="closePODelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="po-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closePODelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeletePO()">Delete</button></div>
  </div>
</div>
<!-- SUPPLIER MODALS -->
<div class="g-modal-overlay" id="sup-modal">
  <div class="g-modal" style="max-width:620px">
    <div class="g-modal-head"><span id="sup-modal-title">Add Supplier</span><button class="g-modal-close" onclick="closeSupModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Code *</label><input id="sup-f-code" placeholder="SUP-001"/></div>
        <div class="g-form-group"><label>Name *</label><input id="sup-f-name" placeholder="Supplier name"/></div>
        <div class="g-form-group"><label>Contact Person</label><input id="sup-f-contact" placeholder="Full name"/></div>
        <div class="g-form-group"><label>Role</label><input id="sup-f-role" placeholder="Account Manager"/></div>
        <div class="g-form-group"><label>Email</label><input type="email" id="sup-f-email" placeholder="email@example.com"/></div>
        <div class="g-form-group"><label>Phone</label><input id="sup-f-phone" placeholder="+63 9XX XXX XXXX"/></div>
        <div class="g-form-group"><label>Category</label><input id="sup-f-category" placeholder="Electronics, etc."/></div>
        <div class="g-form-group"><label>Location</label><input id="sup-f-location" placeholder="City, Province"/></div>
        <div class="g-form-group"><label>Status</label><select id="sup-f-status"><option>Active</option><option>Inactive</option></select></div>
      </div>
      <div class="g-form-group"><label>2303 Certificate File</label><input type="file" id="sup-f-2303" accept=".pdf,.doc,.docx,.png,.jpg"/><div id="sup-cur-2303" style="font-size:11px;color:var(--text-2);margin-top:4px"></div></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeSupModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveSup()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="sup-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Supplier</span><button class="g-modal-close" onclick="closeSupDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="sup-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeSupDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteSup()">Delete</button></div>
  </div>
</div>
<!-- GOODS RECEIVED MODALS -->
<div class="g-modal-overlay" id="gr-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="gr-modal-title">Add Goods Received</span><button class="g-modal-close" onclick="closeGRModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>GR Number *</label><input id="gr-f-grno" placeholder="GR-2024-001"/></div>
        <div class="g-form-group"><label>PO Number</label><input id="gr-f-pono" placeholder="PO-2024-001"/></div>
        <div class="g-form-group"><label>Supplier *</label><input id="gr-f-supplier" placeholder="Supplier name"/></div>
        <div class="g-form-group"><label>Received Date</label><input type="date" id="gr-f-date"/></div>
        <div class="g-form-group"><label>Received By</label><input id="gr-f-by" placeholder="Name"/></div>
        <div class="g-form-group"><label>Total Items</label><input type="number" id="gr-f-items" min="0" value="0"/></div>
        <div class="g-form-group"><label>Status</label><select id="gr-f-status"><option>Pending</option><option>Completed</option><option>Partial</option></select></div>
      </div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeGRModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveGR()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="gr-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete GR</span><button class="g-modal-close" onclick="closeGRDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="gr-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeGRDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteGR()">Delete</button></div>
  </div>
</div>
<!-- STOCK TRANSFERS MODALS -->
<div class="g-modal-overlay" id="st-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="st-modal-title">Add Stock Transfer</span><button class="g-modal-close" onclick="closeSTModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Transfer No. *</label><input id="st-f-no" placeholder="ST-2024-001"/></div>
        <div class="g-form-group"><label>Transfer Date</label><input type="date" id="st-f-date"/></div>
        <div class="g-form-group"><label>From Location *</label><input id="st-f-from" placeholder="Source"/></div>
        <div class="g-form-group"><label>To Location *</label><input id="st-f-to" placeholder="Destination"/></div>
        <div class="g-form-group"><label>Items Count</label><input type="number" id="st-f-items" min="0" value="0"/></div>
        <div class="g-form-group"><label>Status</label><select id="st-f-status"><option>Pending</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></div>
        <div class="g-form-group"><label>Transferred By</label><input id="st-f-by" placeholder="Name"/></div>
      </div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeSTModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveST()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="st-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Transfer</span><button class="g-modal-close" onclick="closeSTDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="st-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeSTDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteST()">Delete</button></div>
  </div>
</div>
<!-- LOGISTICS MODALS -->
<div class="g-modal-overlay" id="tq-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="tq-modal-title">Add Quotation</span><button class="g-modal-close" onclick="closeTQModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Quote Number *</label><input id="tq-f-qno" placeholder="TQ-2024-001"/></div>
        <div class="g-form-group"><label>Trucking Service *</label><input id="tq-f-service" placeholder="Provider name"/></div>
        <div class="g-form-group"><label>Date of Activity</label><input type="date" id="tq-f-date"/></div>
        <div class="g-form-group"><label>Status</label><select id="tq-f-status"><option>Pending</option><option>Approved</option><option>Rejected</option><option>Completed</option></select></div>
      </div>
      <div class="g-form-group"><label>Sites</label><input id="tq-f-sites" placeholder="Sites covered"/></div>
      <div class="g-form-group"><label>Total Amount</label><input type="number" id="tq-f-amount" min="0" step="0.01" placeholder="0.00"/></div>
      <div class="g-form-group"><label>Attach File</label><input type="file" id="tq-f-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"/><div id="tq-cur-file" style="font-size:11px;color:var(--text-2);margin-top:4px"></div></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeTQModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveTQ()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="tq-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Quotation</span><button class="g-modal-close" onclick="closeTQDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="tq-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeTQDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteTQ()">Delete</button></div>
  </div>
</div>
<!-- MANPOWER MODALS -->
<div class="g-modal-overlay" id="mp-modal">
  <div class="g-modal" style="max-width:580px">
    <div class="g-modal-head"><span id="mp-modal-title">Add Manpower Request</span><button class="g-modal-close" onclick="closeMPModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Request No.</label><input id="mp-f-rno" readonly style="background:#f1f5f9;color:#64748b"/></div>
        <div class="g-form-group"><label>Location *</label><input id="mp-f-loc" placeholder="Site / Location"/></div>
        <div class="g-form-group"><label>Machine Type *</label><input id="mp-f-mtype" placeholder="Machine type"/></div>
        <div class="g-form-group"><label>Manpower Qty</label><input type="number" id="mp-f-mpqty" min="0" value="0" oninput="calcMPTotal()"/></div>
        <div class="g-form-group"><label>Unit Price</label><input type="number" id="mp-f-up" min="0" step="0.01" value="0" oninput="calcMPTotal()"/></div>
        <div class="g-form-group"><label>Total</label><input id="mp-f-total" readonly style="background:#f1f5f9;font-weight:700;color:var(--primary)"/></div>
      </div>
      <div class="g-form-group"><label>Purpose</label><input id="mp-f-purpose" placeholder="Purpose"/></div>
      <div class="g-form-group"><label>Remarks</label><textarea id="mp-f-remarks" rows="2" placeholder="Notes..."></textarea></div>
      <div class="g-form-group"><label>Attach File</label><input type="file" id="mp-f-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"/><div id="mp-cur-file" style="font-size:11px;color:var(--text-2);margin-top:4px"></div></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeMPModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveMP()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="mp-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Request</span><button class="g-modal-close" onclick="closeMPDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="mp-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeMPDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteMP()">Delete</button></div>
  </div>
</div>
<!-- SITES ACTIVITY MODALS -->
<div class="g-modal-overlay" id="sa-modal">
  <div class="g-modal" style="max-width:560px">
    <div class="g-modal-head"><span id="sa-modal-title">Add Site Activity</span><button class="g-modal-close" onclick="closeSAModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Site Name *</label><input id="sa-f-site" placeholder="Branch name"/></div>
        <div class="g-form-group"><label>Activity Type</label><select id="sa-f-type"><option value="Delivery">Delivery</option><option value="Pullout">Pullout</option></select></div>
        <div class="g-form-group"><label>Date</label><input type="date" id="sa-f-date"/></div>
        <div class="g-form-group"><label>Status</label><select id="sa-f-status"><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></div>
      </div>
      <div class="g-form-group"><label>Location</label><input id="sa-f-loc" placeholder="Address / Area"/></div>
      <div class="g-form-group"><label>Description</label><textarea id="sa-f-desc" rows="3" placeholder="Details..."></textarea></div>
      <div class="g-form-group"><label>Attach File</label><input type="file" id="sa-f-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"/></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeSAModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveSA()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="sa-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Activity</span><button class="g-modal-close" onclick="closeSADelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete activity at <strong id="sa-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeSADelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteSA()">Delete</button></div>
  </div>
</div>
<!-- WAYBILL MODALS -->
<div class="g-modal-overlay" id="wb-modal">
  <div class="g-modal" style="max-width:540px">
    <div class="g-modal-head"><span id="wb-modal-title">Add Waybill</span><button class="g-modal-close" onclick="closeWBModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Waybill Number *</label><input id="wb-f-wno" placeholder="WB-2024-001"/></div>
        <div class="g-form-group"><label>Date</label><input type="date" id="wb-f-date"/></div>
        <div class="g-form-group"><label>Origin</label><input id="wb-f-origin" placeholder="Pickup location"/></div>
        <div class="g-form-group"><label>Destination</label><input id="wb-f-dest" placeholder="Drop-off location"/></div>
      </div>
      <div class="g-form-group"><label>Notes</label><textarea id="wb-f-notes" rows="2" placeholder="Additional notes..."></textarea></div>
      <div class="g-form-group"><label>Attach File</label><input type="file" id="wb-f-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"/><div id="wb-cur-file" style="font-size:11px;color:var(--text-2);margin-top:4px"></div></div>
    </div>
    <div class="g-modal-foot"><button class="g-btn g-btn-cancel" onclick="closeWBModal()">Cancel</button><button class="g-btn g-btn-save" onclick="saveWB()">Save</button></div>
  </div>
</div>
<div class="g-modal-overlay" id="wb-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Waybill</span><button class="g-modal-close" onclick="closeWBDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete <strong id="wb-del-name"></strong>?</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeWBDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteWB()">Delete</button></div>
  </div>
</div>
<!-- ===== ACTIVITY CALENDAR TASK MODAL ===== -->
<div class="g-modal-overlay" id="ac-task-modal">
  <div class="g-modal" style="max-width:500px">
    <div class="g-modal-head"><span id="ac-task-modal-title">Add Task</span><button class="g-modal-close" onclick="closeACModal()">&#215;</button></div>
    <div class="g-modal-body">
      <div class="g-form-group"><label>Date <span style="color:var(--danger)">*</span></label><input type="date" id="ac-f-date"/></div>
      <div class="g-form-group"><label>Title <span style="color:var(--danger)">*</span></label><input id="ac-f-title" placeholder="Task title"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="g-form-group"><label>Category</label>
          <select id="ac-f-category">
            <option>Work</option><option>Meeting</option><option>Delivery</option>
            <option>Maintenance</option><option>Personal</option><option selected>General</option>
          </select>
        </div>
        <div class="g-form-group"><label>Priority</label>
          <select id="ac-f-priority"><option>Low</option><option selected>Medium</option><option>High</option></select>
        </div>
      </div>
      <div class="g-form-group"><label>Status</label>
        <select id="ac-f-status"><option selected>Pending</option><option>In Progress</option><option>Done</option><option>Cancelled</option></select>
      </div>
      <div class="g-form-group"><label>Description</label><textarea id="ac-f-desc" rows="3" placeholder="Optional notes or details..." style="resize:vertical"></textarea></div>
      <div class="g-form-group">
        <label>Color</label>
        <div class="ac-color-row" id="ac-color-row">
          <div class="ac-color-swatch selected" style="background:#6366f1" data-color="#6366f1" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#f59e0b" data-color="#f59e0b" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#10b981" data-color="#10b981" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#ef4444" data-color="#ef4444" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#8b5cf6" data-color="#8b5cf6" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#ec4899" data-color="#ec4899" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#64748b" data-color="#64748b" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#0ea5e9" data-color="#0ea5e9" onclick="acPickColor(this)"></div>
          <div class="ac-color-swatch" style="background:#f97316" data-color="#f97316" onclick="acPickColor(this)"></div>
        </div>
      </div>
    </div>
    <div class="g-modal-foot">
      <button class="g-btn g-btn-cancel" onclick="closeACModal()">Cancel</button>
      <button class="g-btn g-btn-save" onclick="saveACTask()">Save Task</button>
    </div>
  </div>
</div>
<!-- ===== ACTIVITY CALENDAR DELETE MODAL ===== -->
<div class="g-modal-overlay" id="ac-del-modal">
  <div class="g-modal" style="max-width:400px">
    <div class="g-modal-head"><span>Delete Task</span><button class="g-modal-close" onclick="closeACDelModal()">&#215;</button></div>
    <div class="g-modal-body" style="text-align:center;padding:24px"><p>Delete task <strong id="ac-del-name"></strong>?</p><p style="color:var(--text-2);font-size:12px;margin-top:8px">This action cannot be undone.</p></div>
    <div class="g-modal-foot" style="justify-content:center"><button class="g-btn g-btn-cancel" onclick="closeACDelModal()">Cancel</button><button class="g-btn g-btn-delete" onclick="confirmDeleteACTask()">Delete</button></div>
  </div>
</div>
<script>