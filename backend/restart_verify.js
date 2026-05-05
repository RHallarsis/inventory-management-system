const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path: '/api' + path, method: 'GET' };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.substring(0, 120) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const endpoints = [
    '/stats',
    '/inventory',
    '/spare-parts',
    '/machine-monitoring',
    '/categories',
    '/purchase-orders',
    '/suppliers',
    '/goods-received',
    '/stock-transfers',
    '/local-purchases',
    '/calendar/tasks',
    '/users',
    '/logistics/trucking',
    '/logistics/manpower',
    '/logistics/sites-activity',
    '/logistics/waybills',
    '/line/config',
  ];

  console.log('=== API HEALTH CHECK ===\n');
  let pass = 0, fail = 0;

  for (const ep of endpoints) {
    try {
      const r = await apiGet(ep);
      const ok = r.status === 200;
      if (ok) pass++; else fail++;
      console.log((ok ? '✓' : '✗') + ' GET ' + ep + ' → ' + r.status);
      if (!ok) console.log('  Body: ' + r.body);
    } catch (e) {
      fail++;
      console.log('✗ GET ' + ep + ' → ERROR: ' + e.message);
    }
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
}

main();
