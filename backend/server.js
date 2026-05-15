const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Initialise DB — creates the file and seeds data on first run
require('./database');

const inventoryRouter      = require('./routes/inventory');
const jobsRouter           = require('./routes/jobs');
const logisticsRouter      = require('./routes/logistics');
const authRouter           = require('./routes/auth');
const calendarRouter       = require('./routes/calendar');
const { router: lineRouter } = require('./routes/line');
const localPurchasesRouter = require('./routes/local-purchases');
const ciplRouter           = require('./routes/cipl');
const auditRouter          = require('./routes/audit');
const alertsRouter         = require('./routes/alerts');
const statsRouter          = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Health check — responds immediately, before DB init completes ──
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Diagnostic: test email + env check ────────────────────────
const { dbPromise } = require('./database');
const { sendApprovedPODraft } = require('./services/outlookDraftService');
app.get('/api/diag/email', async (req, res) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  try {
    const { db } = await dbPromise;
    const suppliers = await db.getAll("SELECT name, email FROM suppliers ORDER BY name");
    if (req.query.send === '1' && gmailUser && gmailPass) {
      await sendApprovedPODraft({
        po_number: 'TEST-001', order_date: new Date().toISOString().slice(0,10),
        supplier_name: 'Test Supplier', supplier_email: gmailUser,
        total_amount: 1234.56,
      });
      return res.json({ status: 'test email sent to ' + gmailUser, suppliers });
    }
    res.json({
      GMAIL_USER: gmailUser ? '✅ set (' + gmailUser + ')' : '❌ NOT SET',
      GMAIL_APP_PASSWORD: gmailPass ? '✅ set (length=' + gmailPass.length + ')' : '❌ NOT SET',
      suppliers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
app.use('/', lineRouter);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running at http://0.0.0.0:${PORT}`);
});

// ── Global safety net — log errors instead of crashing ──────────
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
});
