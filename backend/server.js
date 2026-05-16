'use strict';

process.on('uncaughtException',  err    => console.error('[CRASH] uncaughtException:',  err.stack || err.message));
process.on('unhandledRejection', reason => console.error('[CRASH] unhandledRejection:', reason));

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Diagnostics object (filled during startup) ──────────────────────────
const diag = { routeErrors: {}, dbError: null, ready: false, databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET', node: process.version };

// ── Health + diag always available ───────────────────────────────────────
app.get('/health',   (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/api/diag', (_req, res) => res.json(diag));

// ── Static files ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads',  express.static(path.join(__dirname, 'uploads')));

// ── Load database ─────────────────────────────────────────────────────────
try {
  require('./database');
  console.log('[server] database.js loaded');
} catch (e) {
  console.error('[server] FAILED database.js:', e.message);
  diag.dbError = e.message;
}

// ── Helper: load a route file, return empty Router on error ───────────────
function loadRouter(name, file) {
  try {
    const r = require(file);
    console.log('[server] loaded:', name);
    return r;
  } catch (e) {
    console.error(`[server] FAILED ${name}:`, e.stack || e.message);
    diag.routeErrors[name] = e.message;
    return express.Router();
  }
}

// ── Load all routes SYNCHRONOUSLY ────────────────────────────────────────
const inventoryRouter      = loadRouter('inventory',       './routes/inventory');
const jobsRouter           = loadRouter('jobs',            './routes/jobs');
const logisticsRouter      = loadRouter('logistics',       './routes/logistics');
const authRouter           = loadRouter('auth',            './routes/auth');
const calendarRouter       = loadRouter('calendar',        './routes/calendar');
const lineResult           = loadRouter('line',            './routes/line');
const lineRouter           = lineResult.router || lineResult;
const localPurchasesRouter = loadRouter('local-purchases', './routes/local-purchases');
const ciplRouter           = loadRouter('cipl',            './routes/cipl');
const auditRouter          = loadRouter('audit',           './routes/audit');
const alertsRouter         = loadRouter('alerts',          './routes/alerts');
const statsRouter          = loadRouter('stats',           './routes/stats');

// ── Mount all routes SYNCHRONOUSLY ───────────────────────────────────────
app.use('/api', inventoryRouter);
app.use('/api', jobsRouter);
app.use('/api', logisticsRouter);
app.use('/api', authRouter);
app.use('/api', calendarRouter);
app.use('/api', lineRouter);
app.use('/api', localPurchasesRouter);
app.use('/api', ciplRouter);
app.use('/api', auditRouter);
app.use('/api', alertsRouter);
app.use('/api', statsRouter);
try { app.use('/', lineRouter); } catch (_) {}

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

diag.ready = true;
console.log('[server] All routes mounted. Errors:', JSON.stringify(diag.routeErrors));

// ── Start listening ───────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on port ${PORT}`);
});
