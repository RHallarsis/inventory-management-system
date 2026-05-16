'use strict';

// ── Safety net registered FIRST, before any require() calls ─────────────
process.on('uncaughtException',   err  => console.error('[CRASH] uncaughtException:', err.stack || err.message));
process.on('unhandledRejection',  reason => console.error('[CRASH] unhandledRejection:', reason));

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── /health responds immediately — before DB or routes are loaded ────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Bind port NOW so Railway healthcheck can always reach us ────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on port ${PORT}`);
});

// ── Collect route-load errors for diagnostics ────────────────────────────
const routeErrors = {};

// ── Load DB and routes asynchronously after port is bound ───────────────
(async () => {
  console.log('[server] Starting DB + route init...');
  console.log('[server] NODE_PATH:', process.env.NODE_PATH || '(not set)');
  console.log('[server] __dirname:', __dirname);
  console.log('[server] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  try { require('./database'); console.log('[server] database.js loaded'); }
  catch (e) { console.error('[server] FAILED database.js:', e.message); routeErrors['database'] = e.message; }

  const loadRouter = (name, file) => {
    try {
      const r = require(file);
      console.log(`[server] loaded route: ${name}`);
      return r;
    } catch (e) {
      console.error(`[server] FAILED route ${name}:`, e.message);
      routeErrors[name] = e.message;
      return express.Router(); // empty fallback
    }
  };

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

  // ── Mount all routers ──────────────────────────────────────────────────
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

  // ── Diagnostics endpoint — shows exactly what failed to load ─────────
  app.get('/api/diag', (_req, res) => {
    res.json({
      routeErrors,
      loadedOk: Object.keys(routeErrors).length === 0,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      nodeVersion: process.version,
      dirname: __dirname,
      uptime: Math.round(process.uptime()),
    });
  });

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  console.log('[server] All routes mounted. Ready. Errors:', JSON.stringify(routeErrors));
})();
