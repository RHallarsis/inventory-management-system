const fs = require('fs');
const path = 'E:/Projects/Inventory Management Web App/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');

// Fix 1: loadUsers - relative fetch('/api/users') → fetch(API+'/users')
html = html.replace("const res = await fetch('/api/users');", "const res = await fetch(API+'/users');");

// Fix 2: saveUser - relative url construction
html = html.replace(
  "const url = id ? `/api/users/${id}` : '/api/users';",
  "const url = id ? API+'/users/'+id : API+'/users';"
);

// Fix 3: deleteUser - relative fetch
html = html.replace(
  "const res = await fetch(`/api/users/${id}`, { method:'DELETE' });",
  "const res = await fetch(API+'/users/'+id, { method:'DELETE' });"
);

fs.writeFileSync(path, html, 'utf8');

// Verify no relative /api/users remain
const lines = html.split('\n');
let found = false;
lines.forEach((l, i) => {
  if (l.includes("'/api/users'") || l.includes('`/api/users')) {
    console.log('STILL RELATIVE at line ' + (i+1) + ': ' + l.trim());
    found = true;
  }
});

if (!found) {
  console.log('ALL FIXED - no relative /api/users URLs remain.');
}

// Show the fixed lines
lines.forEach((l, i) => {
  if (l.includes("API+'/users'") || l.includes("API+'/users/'+id")) {
    console.log('FIXED line ' + (i+1) + ': ' + l.trim());
  }
});
