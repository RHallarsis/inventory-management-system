const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/backend/routes/inventory.js';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// Remove trailing orphaned supplier-2303 comment headers and blank lines at end
while (lines.length > 0) {
  const last = lines[lines.length - 1].trim();
  if (last === '' || last.includes('══') || last.includes('SUPPLIER 2303') || last.includes('module.exports')) {
    lines.pop();
  } else {
    break;
  }
}

// Add module.exports
lines.push('');
lines.push('module.exports = router;');

fs.writeFileSync(path, lines.join('\n'), 'utf8');

// Verify
const verify = fs.readFileSync(path, 'utf8');
const vlines = verify.split('\n');
console.log('Total lines:', vlines.length);
console.log('Last 3 lines:');
vlines.slice(-3).forEach((l, i) => console.log((vlines.length - 2 + i) + ': ' + l));
console.log('module.exports present:', verify.includes('module.exports = router'));
console.log('No /users route:', !verify.includes("router.get('/users'"));
console.log('No /local-purchases route:', !verify.includes("router.get('/local-purchases'"));
console.log('No /supplier-2303 route:', !verify.includes("router.get('/supplier-2303'"));
