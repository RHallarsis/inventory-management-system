'use strict';
// deploy: 2026-08-06 force redeploy (test GitHub App reconnect to Perception-Gaming-Inc org)

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
  authError:   null,
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

// Identify the caller (if any) on every /api/* request, from the
// X-User-Id / X-Session-Token headers the frontend now sends on every
// call. This does NOT block anything by itself — individual routes
// decide what to require via requireAuth/requireRole/requireWrite
// (see routes/*.js and middleware/auth.js). Loaded defensively so a
// problem here can never take down /health or /api/diag.
let attachUser = (_req, _res, next) => next();
try {
  ({ attachUser } = require('./middleware/auth'));
  console.log('[server] auth middleware loaded');
} catch (e) {
  console.error('[server] FAILED middleware/auth:', e.message);
  diag.authError = e.message;
}
app.use('/api', attachUser);

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

// Uploaded files (PO/SI/CI-PL/Suppliers/Stock-Transfers/Pullout/
// Transmittal/Logistics/Supplier-Quotations attachments): every one of
// these modules counts as a "Documents" section, so Admin/Manager/Staff
// may open or download any file; Viewer may never open, preview, or
// download any attachment, anywhere (view-only, matches the access-
// privileges spec). Must be logged in at all to reach any file.
app.use('/uploads', attachUser, (req, res, next) => {
  const role = req.currentUser && req.currentUser.role;
  if (!role) return res.status(401).json({ error: 'Login required.' });
  if (role === 'Viewer') {
    return res.status(403).json({ error: 'Viewer accounts cannot open, preview, or download files.' });
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Bind port FIRST so Railway healthcheck always passes
app.listen(PORT, '0.0.0.0', () => console.log(`[server] Listening on port ${PORT}`));

// Load everything in a try/catch IIFE so any crash is captured in diag
(async () => {
  try {
    console.log('[server] Starting init... DATABASE_URL:', diag.databaseUrl);

    let dbPromise = null;
    try { ({ dbPromise } = require('./database')); console.log('[server] database.js loaded'); }
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
    const lineResult           = loadRouter('line',            './routes/line');
    const lineRouter           = lineResult.router || lineResult;
    const localPurchasesRouter = loadRouter('local-purchases', './routes/local-purchases');
    const ciplRouter           = loadRouter('cipl',            './routes/cipl');
    const auditRouter          = loadRouter('audit',           './routes/audit');
    const alertsRouter         = loadRouter('alerts',          './routes/alerts');
    const statsRouter               = loadRouter('stats',               './routes/stats');
    const activityLogsRouter        = loadRouter('activity-logs',       './routes/activity-logs');
    const supplierQuotationsRouter  = loadRouter('supplier-quotations', './routes/supplier-quotations');

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
    app.use('/api', supplierQuotationsRouter);
    app.use('/api', activityLogsRouter);
    try { app.use('/', lineRouter); } catch (_) {}

    app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

    // ── Daily low-stock LINE notification scheduler ──────────────────────
    // Ticks every 15 minutes; the actual send is gated inside
    // checkAndSendScheduledLowStockLine (only fires once per Manila calendar
    // day, from 8 AM onward, and only when enabled in Settings), so firing
    // this often is cheap and harmless.
    if (dbPromise && typeof alertsRouter.checkAndSendScheduledLowStockLine === 'function') {
      setInterval(async () => {
        try {
          const { db } = await dbPromise;
          await alertsRouter.checkAndSendScheduledLowStockLine(db);
        } catch (e) {
          console.error('[low-stock-scheduler] tick failed:', e.message);
        }
      }, 15 * 60 * 1000);
      console.log('[server] Low-stock LINE scheduler started (checks every 15 min).');
    }

    diag.ready = true;
    console.log("[server] Ready. Route errors:", JSON.stringify(diag.routeErrors));
  } catch (err) {
    diag.iifeError = err.stack || err.message;
    console.error("[server] IIFE CRASHED:", diag.iifeError);
  }
})();
