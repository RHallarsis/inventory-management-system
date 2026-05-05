const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/backend/routes/inventory.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Remove all trailing blank lines and module.exports lines
while (lines.length > 0) {
  const t = lines[lines.length - 1].trim();
  if (t === '' || t === 'module.exports = router;') {
    lines.pop();
  } else {
    break;
  }
}

// Add exactly one module.exports
lines.push('');
lines.push('module.exports = router;');

fs.writeFileSync(path, lines.join('\n'), 'utf8');

const v = fs.readFileSync(path, 'utf8').split('\n');
console.log('Final lines:', v.length);
console.log('Last 4:');
v.slice(-4).forEach((l, i) => console.log((v.length - 3 + i) + ': ' + l));
const exportCount = v.filter(l => l.trim() === 'module.exports = router;').length;
console.log('module.exports count:', exportCount, exportCount === 1 ? '✓' : 'ERROR - should be 1');
