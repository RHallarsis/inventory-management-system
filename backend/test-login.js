const http = require('http');
const body = JSON.stringify({ identifier: 'Rogen Hallarsis', password: '063013' });
const opts = {
  hostname: 'localhost', port: 3000, path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};
const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', d));
});
req.on('error', e => console.error('ERROR:', e.message));
req.write(body);
req.end();
