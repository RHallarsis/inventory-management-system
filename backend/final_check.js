const fs = require('fs');

// ── 1. Extract JS and syntax-check it ───────────────────────────────────────
const html = fs.readFileSync(
  'E:/Projects/Inventory Management Web App/frontend/index.html', 'utf8');

// Find the LAST bare <script> tag (not <script src=...>)
let pos = -1, search = 0;
while (true) {
  const idx = html.indexOf('<script>', search);
  if (idx === -1) break;
  pos = idx;
  search = idx + 1;
}
if (pos === -1) { console.log('ERROR: no <script> found'); process.exit(1); }

const scriptEnd = html.lastIndexOf('</script>');
const js = html.substring(pos + 8, scriptEnd);
fs.writeFileSync(
  'E:/Projects/Inventory Management Web App/backend/_final_js.js', js);
console.log('JS lines:', js.split('\n').length);

// ── 2. Check for relative fetch URLs ────────────────────────────────────────
const lines = html.split('\n');
let relCount = 0;
lines.forEach((l, i) => {
  if ((l.includes("fetch('/api") || l.includes('fetch(`/api')) && !l.includes('//')) {
    console.log('RELATIVE URL line ' + (i+1) + ': ' + l.trim());
    relCount++;
  }
});
console.log(relCount === 0 ? '✓ No relative API fetch URLs' : relCount + ' relative URL(s) found');

// ── 3. Check for duplicate let/const declarations ───────────────────────────
const jsLines = js.split('\n');
const declared = {};
let dupCount = 0;
jsLines.forEach((l, i) => {
  const m = l.match(/^\s*(?:let|const)\s+(\w+)\s*[=;,]/);
  if (m) {
    const name = m[1];
    if (declared[name]) {
      console.log('DUPLICATE DECL: ' + name + ' at JS line ' + (i+1) + ' (first at ' + declared[name] + ')');
      dupCount++;
    } else {
      declared[name] = i + 1;
    }
  }
});
console.log(dupCount === 0 ? '✓ No duplicate let/const declarations' : dupCount + ' duplicate(s) found');

// ── 4. Check all route files load without error ──────────────────────────────
const routeFiles = ['auth', 'inventory', 'local-purchases', 'calendar', 'line', 'logistics', 'jobs'];
routeFiles.forEach(f => {
  try {
    delete require.cache[require.resolve('./routes/' + f)];
    require('./routes/' + f);
    console.log('✓ routes/' + f + '.js loads OK');
  } catch(e) {
    console.log('✗ routes/' + f + '.js ERROR: ' + e.message);
  }
});

// ── 5. Check index.html structure ───────────────────────────────────────────
const scriptTagCount = (html.match(/<script>/g) || []).length;
const scriptEndCount = (html.match(/<\/script>/g) || []).length;
const bodyEndCount   = (html.match(/<\/body>/g)   || []).length;
const htmlEndCount   = (html.match(/<\/html>/g)   || []).length;
console.log('');
console.log('HTML structure:');
console.log('  <script> tags:', scriptTagCount, scriptTagCount === 1 ? '✓' : '⚠');
console.log('  </script> tags:', scriptEndCount);
console.log('  </body> tags:', bodyEndCount, bodyEndCount === 1 ? '✓' : '⚠');
console.log('  </html> tags:', htmlEndCount, htmlEndCount === 1 ? '✓' : '⚠');
console.log('  Total HTML lines:', lines.length);
