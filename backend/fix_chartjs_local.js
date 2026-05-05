const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');

const oldTag = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>';
const newTag = '<script src="/chart.min.js"></script>';

if (!html.includes(oldTag)) {
  console.log('ERROR: CDN script tag not found');
  process.exit(1);
}

html = html.replace(oldTag, newTag);
fs.writeFileSync(path, html, 'utf8');

// Verify
const lines = html.split('\n');
const idx = lines.findIndex(l => l.includes('chart'));
console.log('Script tags at top of file:');
lines.slice(0, 15).forEach((l, i) => {
  if (l.includes('<script')) console.log((i+1) + ': ' + l.trim());
});
console.log('');
console.log(html.includes('/chart.min.js') ? '✓ Now using local chart.min.js' : 'ERROR: replacement failed');
console.log(html.includes('cdn.jsdelivr.net/npm/chart.js') ? 'ERROR: CDN ref still present' : '✓ CDN ref removed');
