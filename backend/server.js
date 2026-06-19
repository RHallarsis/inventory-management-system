'use strict';
// deploy: 2026-06-11 force redeploy

process.on('uncaughtException',  err    => console.error('[CRASH] uncaughtException:',  err.stack || err.message));
process.on('unhandledRejection', reason => console.error('[CRASH] unhandledRejection:', reason));

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Always-available diagnostics (registered before anything that can fail)
const diag = {
  routeErrors: {},
  dbError:     null,
  iifeError:   null,
  ready:       false,
  databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  node:        process.version,
};

app.get('/health',   (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/api/diag', (_req, res) => res.json({
  ...diag,
  BREVO_API_KEY: process.env.BREVO_API_KEY ? `✅ set (length=${process.env.BREVO_API_KEY.length})` : '❌ NOT SET',
  GMAIL_USER:    process.env.GMAIL_USER    ? `✅ set (${process.env.GMAIL_USER})`                  : '❌ NOT SET',
}));

// ── Quick Brevo test: GET /api/test-email?to=you@email.com ────
app.get('/api/test-email', async (req, res) => {
  const https = require('https');
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const FROM_EMAIL    = process.env.BREVO_FROM || process.env.GMAIL_USER || '';
  const to = req.query.to || FROM_EMAIL;
  if (!BREVO_API_KEY) return res.status(500).json({ error: 'BREVO_API_KEY not set' });
  if (!FROM_EMAIL)    return res.status(500).json({ error: 'GMAIL_USER / BREVO_FROM not set' });
  const payload = JSON.stringify({
    sender:      { name: 'IMS Test', email: FROM_EMAIL },
    to:          [{ email: to }],
    subject:     'IMS Email Test — ' + new Date().toISOString(),
    htmlContent: '<p>This is a test email from your Inventory Management System (Brevo).</p>',
  });
  const options = {
    hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };
  try {
    const result = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => resolve({ status: resp.statusCode, body: d }));
      });
      r.on('error', reject);
      r.setTimeout(15000, () => { r.destroy(); reject(new Error('timeout')); });
      r.write(payload); r.end();
    });
    res.json({ from: FROM_EMAIL, to, brevo_status: result.status, brevo_response: JSON.parse(result.body || '{}') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files — HTML is never cached so browsers always get fresh JS
app.use(express.static(path.join(__dirname, '../frontend'), {
  etag: false,
  lastModified: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Bind port FIRST so Railway healthcheck always passes
app.listen(PORT, '0.0.0.0', () => console.log(`[server] Listening on port ${PORT}`));

// Load everything in a try/catch IIFE so any crash is captured in diag
(async () => {
  try {
    console.log('[server] Starting init... DATABASE_URL:', diag.databaseUrl);

    try { require('./database'); console.log('[server] database.js loaded'); }
    catch (e) { console.error('[server] FAILED database.js:', e.message); diag.dbError = e.message; }

    function loadRouter(name, file) {
      try {
        const r = require(file);
        console.log('[server] loaded:', name);
        return r;
      } catch (e) {
        console.error(`[server] FAILED ${name}:`, e.message);
        diag.routeErrors[name] = e.message;
        return express.Router();
      }
    }

    const inventoryRouter      = loadRouter('inventory',       './routes/inventory');
    const jobsRouter           = loadRouter('jobs',            './routes/jobs');
    const logisticsRouter      = loadRouter('logistics',       './routes/logistics');
    const authRouter           = loadRouter('auth',            './routes/auth');
    const calendarRouter       = loadRouter('calendar',        './routes/calendar');
    con