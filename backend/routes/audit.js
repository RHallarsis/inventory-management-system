'use strict';
const express = require('express');
const { dbPromise } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Legacy/orphaned log table (superseded by user_activity_logs) — treated
// the same as the Logs section: viewing is Admin/Manager only.
router.use('/audit-log', requireAuth);
const logsOnly = requireRole('Admin', 'Manager');

// GET /api/audit-log — paginated audit log
router.get('/audit-log', logsOnly, async (req, res) => {
  try {
    const { db } = await dbPromise;
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const rows = await db.getAll(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const total = await db.scalar('SELECT COUNT(*) FROM audit_logs');
    res.json({ rows, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/audit-log — write an entry (called internally too)
router.post('/audit-log', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { user_name, user_email, action, entity, entity_id, details } = req.body;
    await db.run(
      `INSERT INTO audit_logs (user_name, user_email, action, entity, entity_id, details) VALUES (?,?,?,?,?,?)`,
      [user_name||'System', user_email||'', action||'', entity||'', entity_id||null, details||'']
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
