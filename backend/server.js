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

// ── Load DB and routes asynchronously after port is bound ───────────────
(async () => {
  console.log('[server] Starting DB + route init...');

  try { require('./database'); console.log('[server] database.js loaded'); }
  catch (e) { console.error('[server] FAILED database.js:', e.message); }

  const loadRouter = (name, file) => {
    try {
      const r = require(file);
      console.log(`[server] loaded route: ${name}`);
      return r;
    } catch (e) {
      console.error(`[server] FAILED route ${name}:`, e.message);
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

  // ── Diagnostic email endpoint ──────────────────────────────────────────
  try {
    const { dbPromise }         = require('./database');
    const { sendApprovedPODraft } = require('./services/outlookDraftService');
    app.get('/api/diag/email', async (req, res) => {
      try {
        const { db } = await dbPromise;
        const suppliers = await db.getAll('SELECT name, email FROM suppliers ORDER BY name');
        res.json({ suppliers });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });
  } catch (e) { console.error('[server] diag/email setup failed:', e.message); }

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

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  console.log('[server] All routes mounted. Ready.');
})();
