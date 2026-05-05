const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');
let count = 0;

// Replace all remaining hardcoded http://localhost:3000 in href and src attributes
// with a dynamic origin — works both locally and on Railway
html = html.replace(/http:\/\/localhost:3000(\$\{)/g, (match, p1) => {
  count++;
  return '${window.location.origin+' ;
});

// Handle the non-template-literal form: href="http://localhost:3000${r.file_path}"
// Pattern: "http://localhost:3000${something}"  ->  "${window.location.origin+something}"
html = html.replace(/"http:\/\/localhost:3000\$\{([^}]+)\}"/g, (match, inner) => {
  count++;
  return `"\${window.location.origin+${inner}}"`;
});

// Handle the esc() form in fileLink: href="http://localhost:3000${esc(r.file_path)}"
// already covered above, double check:
const remaining = html.split('\n').filter(l =>
  l.includes('localhost:3000') && !l.startsWith('//')
);

fs.writeFileSync(path, html, 'utf8');

if (remaining.length === 0) {
  console.log('✓ All localhost:3000 references replaced (' + count + ' substitutions)');
} else {
  console.log('Still remaining (' + remaining.length + '):');
  remaining.forEach(l => console.log('  ' + l.trim()));
}

// Verify seed change
const dbFile = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/database.js', 'utf8');
const hasRogen = dbFile.includes('Rogen Hallarsis');
const hasAdmin = dbFile.includes('admin@inventory.com');
console.log('✓ Seed has Admin account:', hasAdmin);
console.log('✓ Seed has Rogen Hallarsis account:', hasRogen);
