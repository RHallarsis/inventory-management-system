'use strict';

/**
 * routes/activity-logs.js — User Activity Logs REST API
 *
 * GET  /api/activity-logs        List all logs (newest first), optional ?user=&section=&limit=
 * POST /api/activity-logs        Record a new activity entry
 * DELETE /api/activity-logs      Clear all logs (Admin only)
 */

const express       = require('express');
const { dbPromise } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const router        = express.Router();

// Viewing/clearing the log is the "Logs" section — Admin/Manager only,
// hidden entirely from Staff/Viewer. Recording a NEW entry (POST) stays
// open to any logged-in role: it's how each user's own actions elsewhere
// in the app get written to the log, not a "view logs" permission.
router.use('/activity-logs', requireAuth);
const logsOnly = requireRole('Admin', 'Manager');

// ── GET /api/activity-logs ──────────────────────────────────────────────────
router.get('/activity-logs', logsOnly, async (req, res) => {
  try {
    const { db } = await dbPromise;

    // Auto-purge logs older than 30 days
    // (Postgres uses NOW() - INTERVAL '30 days'; SQLite has no INTERVAL syntax
    // and needs datetime('now','-30 days') instead — branch on DB dialect.)
    if (process.env.DATABASE_URL) {
      await db.run(`DELETE FROM user_activity_logs WHERE created_at < NOW() - INTERVAL '30 days'`);
    } else {
      await db.run(`DELETE FROM user_activity_logs WHERE created_at < datetime('now','-30 days')`);
    }

    const { user, section, action, limit = 50, page = 1 } = req.query;
    const pageSize = Math.max(1, Math.min(200, +limit));
    const offset   = (Math.max(1, +page) - 1) * pageSize;

    let where  = 'WHERE 1=1';
    const params = [];
    if (user)    { where += ' AND LOWER(username) LIKE $' + (params.length+1); params.push('%' + user.toLowerCase() + '%'); }
    if (section) { where += ' AND section = $'            + (params.length+1); params.push(section); }
    if (action)  { where += ' AND action = $'             + (params.length+1); params.push(action); }

    // Total count for pagination
    const countRow = await db.getOne(
      `SELECT COUNT(*) AS total FROM user_activity_logs ${where}`,
      params
    );
    const total = parseInt(countRow?.total ?? countRow?.count ?? 0, 10);

    // Paged rows
    const dataParams = [...params, pageSize, offset];
    const rows = await db.getAll(
      `SELECT * FROM user_activity_logs ${where} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({ rows, total, page: +page, pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/activity-logs ─────────────────────────────────────────────────
router.post('/activity-logs', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { username = '', role = '', action = '', section = '', description = '' } = req.body;
    const id = await db.insert(
      `INSERT INTO user_activity_logs (username, role, action, section, description) VALUES (?,?,?,?,?)`,
      [username.trim(), role.trim(), action.trim(), section.trim(), description.trim()]
    );
    res.status(201).json({ id, ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/activity-logs ───────────────────────────────────────────────
router.delete('/activity-logs', logsOnly, async (_req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM user_activity_logs');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
