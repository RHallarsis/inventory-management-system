const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/backend/routes/inventory.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

console.log('Original lines:', lines.length);

// Find the /users block: starts at the separator before router.get('/users'
// and ends just before the next separator (MACHINE MONITORING)
const usersStart = lines.findIndex(l => l.includes("router.get('/users'"));
const lpStart    = lines.findIndex(l => l.includes("// LOCAL PURCHASE MONITORING CRUD"));
const sup2303Start = lines.findIndex(l => l.includes("router.get('/supplier-2303'"));

// Find separator line before each block (search backwards for the box-draw separator)
function findBlockStart(idx) {
  let i = idx;
  while (i > 0 && (lines[i-1].trim() === '' || lines[i-1].includes('══') || lines[i-1].includes('LOCAL') || lines[i-1].includes('SUPPLIER') || lines[i-1].includes('USER'))) {
    i--;
  }
  return i;
}

// Find block end (next non-blank separator or module.exports)
function findBlockEnd(idx) {
  let i = idx + 1;
  while (i < lines.length) {
    if (lines[i].includes('module.exports')) return i - 1;
    if (lines[i].includes('══') && i > idx + 3) {
      // go back to include blank line before separator
      while (i > idx && lines[i-1].trim() === '') i--;
      return i - 1;
    }
    i++;
  }
  return i - 1;
}

console.log('users block starts near line:', usersStart + 1);
console.log('local-purchases block starts near line:', lpStart + 1);
console.log('supplier-2303 block starts near line:', sup2303Start + 1);

// We'll rebuild the file removing these sections
// Strategy: remove all three duplicate sections
// Mark lines to remove
const toRemove = new Set();

// Remove /users block (lines around usersStart back to separator)
let uStart = usersStart;
while (uStart > 0 && (lines[uStart-1].trim() === '' || lines[uStart-1].includes('══'))) uStart--;
let uEnd = usersStart;
while (uEnd < lines.length - 1 && !lines[uEnd].includes("router.get('/machine-monitoring")){
  uEnd++;
}
// uEnd now points at the machine-monitoring line; go back past blank lines
while (uEnd > usersStart && lines[uEnd-1].trim() === '') uEnd--;
// Mark uStart to uEnd-1 for removal
for (let i = uStart; i < uEnd; i++) toRemove.add(i);
console.log(`Removing /users block: lines ${uStart+1} to ${uEnd} (${uEnd-uStart} lines)`);

// Remove /supplier-2303 block
if (sup2303Start !== -1) {
  let sStart = sup2303Start;
  while (sStart > 0 && (lines[sStart-1].trim() === '' || lines[sStart-1].includes('══') || lines[sStart-1].includes('SUPPLIER'))) sStart--;
  let sEnd = sup2303Start;
  while (sEnd < lines.length - 1 && !lines[sEnd].includes("router.get('/suppliers'")){
    sEnd++;
  }
  while (sEnd > sup2303Start && lines[sEnd-1].trim() === '') sEnd--;
  for (let i = sStart; i < sEnd; i++) toRemove.add(i);
  console.log(`Removing /supplier-2303 block: lines ${sStart+1} to ${sEnd} (${sEnd-sStart} lines)`);
}

// Remove /local-purchases block (from lpStart back to its separator, to module.exports but keep module.exports)
if (lpStart !== -1) {
  let lStart = lpStart;
  while (lStart > 0 && (lines[lStart-1].trim() === '' || lines[lStart-1].includes('══'))) lStart--;
  // remove from lStart to just before module.exports
  let lEnd = lpStart;
  while (lEnd < lines.length - 1 && !lines[lEnd].includes('module.exports')) lEnd++;
  // lEnd is now the module.exports line — don't include it
  for (let i = lStart; i < lEnd; i++) toRemove.add(i);
  console.log(`Removing /local-purchases block: lines ${lStart+1} to ${lEnd} (${lEnd-lStart} lines)`);
}

const newLines = lines.filter((_, i) => !toRemove.has(i));
console.log('New lines:', newLines.length);

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Written successfully.');

// Verify
const verify = fs.readFileSync(path, 'utf8');
const checks = ["/users'", "supplier-2303", "local-purchases"];
checks.forEach(c => {
  const found = verify.includes("router.get('" + c);
  console.log((found ? 'STILL PRESENT' : 'REMOVED') + ': ' + c);
});
