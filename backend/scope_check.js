const fs = require('fs');
const html = fs.readFileSync(
  'E:/Projects/Inventory Management Web App/frontend/index.html', 'utf8');

// Find main script block
let pos = -1, search = 0;
while (true) {
  const idx = html.indexOf('<script>', search);
  if (idx === -1) break;
  pos = idx; search = idx + 1;
}
const scriptEnd = html.lastIndexOf('</script>');
const js = html.substring(pos + 8, scriptEnd);
const lines = js.split('\n');

// Only check top-level declarations (depth 0 = not inside any {})
let depth = 0;
const topLevel = {};
let dupCount = 0;

lines.forEach((l, i) => {
  // Count brace depth changes
  for (const ch of l) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }

  // Only check declarations at depth 0 (top level)
  if (depth === 0 || (depth === 1 && l.includes('{'))) {
    const m = l.match(/^\s*(?:let|const|var)\s+(\w+)/);
    if (m && depth === 0) {
      const name = m[1];
      if (topLevel[name]) {
        console.log('TOP-LEVEL DUPLICATE: ' + name +
          ' at JS line ' + (i+1) + ' (first at ' + topLevel[name] + ')');
        dupCount++;
      } else {
        topLevel[name] = i + 1;
      }
    }
  }
});

if (dupCount === 0) {
  console.log('✓ No top-level duplicate declarations found — JS scope is clean.');
} else {
  console.log(dupCount + ' top-level duplicate(s) — these will break the page!');
}

// Also check the </script> count
const extScripts = (html.match(/<script\s+src=/g) || []).length;
const closeScripts = (html.match(/<\/script>/g) || []).length;
console.log('External <script src=> tags: ' + extScripts);
console.log('Total </script> tags: ' + closeScripts);
console.log('Expected </script> count: ' + (extScripts + 1) + ' (' + extScripts + ' external + 1 main)');
console.log(closeScripts === extScripts + 1 ? '✓ Script tag count correct' : '⚠ Script tag mismatch!');
