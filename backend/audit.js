const fs = require('fs');
const path = require('path');

// Read frontend
const html = fs.readFileSync('E:/Projects/Inventory Management Web App/frontend/index.html', 'utf8');

// Extract all API paths from fetch calls
const fetchRegex = /fetch\((?:API\s*\+\s*['"`]([^'"`]+)['"`]|['"`](https?:\/\/[^'"`]+)['"`])/g;
const apiPaths = new Set();
let m;
while ((m = fetchRegex.exec(html)) !== null) {
  if (m[1]) apiPaths.add(m[1]);
}

console.log('=== API PATHS CALLED IN FRONTEND ===');
[...apiPaths].sort().forEach(p => console.log(' ', p));

// Read all route files
const routesDir = 'E:/Projects/Inventory Management Web App/backend/routes';
const routeFiles = fs.readdirSync(routesDir);
const allRoutes = [];

routeFiles.forEach(f => {
  const content = fs.readFileSync(path.join(routesDir, f), 'utf8');
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let rm;
  while ((rm = routeRegex.exec(content)) !== null) {
    allRoutes.push({ method: rm[1].toUpperCase(), path: rm[2], file: f });
  }
});

console.log('\n=== REGISTERED BACKEND ROUTES ===');
allRoutes.sort((a,b) => a.path.localeCompare(b.path)).forEach(r => {
  console.log(`  ${r.method} ${r.path}  [${r.file}]`);
});

// Check server.js for router mounts
const server = fs.readFileSync('E:/Projects/Inventory Management Web App/backend/server.js', 'utf8');
console.log('\n=== SERVER.JS ROUTER MOUNTS ===');
const mountRegex = /app\.use\s*\(\s*['"`]([^'"`]*)['"`]\s*,\s*(\w+)/g;
let sm;
while ((sm = mountRegex.exec(server)) !== null) {
  console.log(`  app.use('${sm[1]}', ${sm[2]})`);
}

// Check for missing routes
console.log('\n=== CHECKING FOR MISSING BACKEND ROUTES ===');
const prefixMap = {};
allRoutes.forEach(r => {
  // normalize: remove :id params
  const norm = r.path.replace(/:[^/]+/g, ':id');
  prefixMap[norm] = r;
});

[...apiPaths].sort().forEach(p => {
  const norm = p.replace(/\/\d+/g, '/:id').replace(/\/${[^}]+}/g, '/:id');
  const found = allRoutes.some(r => {
    const rNorm = r.path.replace(/:[^/]+/g, ':id');
    return rNorm === norm || rNorm === norm.replace(/\/$/, '');
  });
  if (!found) {
    console.log('  POSSIBLY MISSING: ' + p);
  }
});
