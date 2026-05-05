const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');

// ── Fix 1: Dynamic API base URL ─────────────────────────────────────────────
// Old: hardcoded localhost:3000 — breaks on Railway / any cloud host
// New: auto-detect from current page's origin so it works everywhere
const oldAPI = `const API='http://localhost:3000/api'`;
const newAPI = `const API=window.location.origin+'/api'`;

if (!html.includes(oldAPI)) {
  console.log('ERROR: API constant not found. Searching...');
  const lines = html.split('\n');
  lines.forEach((l,i) => { if(l.includes("const API=")) console.log((i+1)+': '+l.trim()); });
  process.exit(1);
}
html = html.replace(oldAPI, newAPI);
console.log('✓ API constant now uses window.location.origin');

// ── Fix 2: fileLink helper — hardcoded localhost:3000 ───────────────────────
const oldFileLink = `href="http://localhost:3000${esc(r.file_path)}"`;
// Use a regex to catch it regardless of exact spacing
const fileLinkFixed = html.replace(
  /href="http:\/\/localhost:3000\$\{esc\(r\.file_path\)\}"/g,
  'href="${window.location.origin+esc(r.file_path)}"'
);
if (fileLinkFixed !== html) {
  html = fileLinkFixed;
  console.log('✓ fileLink helper fixed');
} else {
  // Try template literal form
  const fileLinkFixed2 = html.replace(
    /href="http:\/\/localhost:3000\$\{/g,
    'href="${window.location.origin+'
  );
  if (fileLinkFixed2 !== html) {
    html = fileLinkFixed2;
    console.log('✓ fileLink template literals fixed');
  } else {
    console.log('  (no fileLink localhost refs found — skipping)');
  }
}

// ── Fix 3: Any remaining hardcoded localhost:3000 in href/src attributes ────
const remaining = [];
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('localhost:3000') && !l.includes('//') && !l.includes('const API')) {
    remaining.push((i+1) + ': ' + l.trim());
  }
});

if (remaining.length > 0) {
  console.log('\nRemaining localhost:3000 references to check:');
  remaining.forEach(r => console.log(' ', r));
} else {
  console.log('✓ No other localhost:3000 references found');
}

fs.writeFileSync(path, html, 'utf8');

// Final verification
const final = fs.readFileSync(path, 'utf8');
const apiLine = final.split('\n').find(l => l.includes('const API='));
console.log('\nFinal API line:', apiLine ? apiLine.trim() : 'NOT FOUND');
console.log(final.includes("window.location.origin+'/api'") ? '✓ Dynamic API confirmed' : '✗ Fix failed');
