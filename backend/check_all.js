const fs = require('fs');
const path = require('path');

// 1. Extract JS from index.html and check syntax
const html = fs.readFileSync('E:/Projects/Inventory Management Web App/frontend/index.html', 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>');
if (scriptStart === -1 || scriptEnd === -1) {
  console.log('ERROR: Could not find <script> tags');
  process.exit(1);
}
const js = html.substring(scriptStart + 8, scriptEnd);
fs.writeFileSync('E:/Projects/Inventory Management Web App/backend/_check2.js', js);
console.log('JS extracted: ' + js.split('\n').length + ' lines');

// 2. Check for any remaining relative API URLs
const lines = html.split('\n');
let issues = 0;
lines.forEach((l, i) => {
  if (l.includes("fetch('/api") || l.includes('fetch(`/api')) {
    console.log('RELATIVE URL at line ' + (i+1) + ': ' + l.trim());
    issues++;
  }
});
if (issues === 0) console.log('OK: No relative fetch URLs found.');

// 3. Check jobs.js route order
const jobs = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/routes/jobs.js', 'utf8');
const jobLines = jobs.split('\n');
const statsLine = jobLines.findIndex(l => l.includes("'/jobs/stats'") || l.includes('"/jobs/stats"'));
const idLine = jobLines.findIndex(l => l.includes("'/:id'") || l.includes('"/:id"'));
console.log('\njobs.js route order:');
console.log('  /jobs/stats at line: ' + (statsLine + 1));
console.log('  /:id at line: ' + (idLine + 1));
if (statsLine !== -1 && idLine !== -1 && statsLine > idLine) {
  console.log('  WARNING: /jobs/stats is defined AFTER /:id — stats route will be shadowed!');
} else {
  console.log('  OK: Route order is correct.');
}

// 4. Check for duplicate route conflicts
const inv = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/routes/inventory.js', 'utf8');
const auth = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/routes/auth.js', 'utf8');
const lp = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/routes/local-purchases.js', 'utf8');

console.log('\nDuplicate route check:');
if (inv.includes("'/users'") && auth.includes("'/users'")) {
  console.log('  CONFLICT: /users defined in BOTH inventory.js AND auth.js');
  console.log('  inventoryRouter is mounted FIRST in server.js — inventory.js wins');
}
if (inv.includes("'/local-purchases'") && lp.includes("'/local-purchases'")) {
  console.log('  CONFLICT: /local-purchases defined in BOTH inventory.js AND local-purchases.js');
}
