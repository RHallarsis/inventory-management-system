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
const router        = express.Router();

// ── GET /api/activity-logs ──────────────────────────────────────────────────
router.get('/activity-logs', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { user, section, action, limit = 500 } = req.query;
    let sql    = 'SELECT * FROM user_activity_logs WHERE 1=1';
    const params = [];
    if (user)    { sql += ' AND LOWER(username) LIKE ?'; params.push('%' + user.toLowerCase() + '%'); }
    if (section) { sql += ' AND section = ?';            params.push(section); }
    if (action)  { sql += ' AND action = ?';             params.push(action); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(+limit);
    const rows = await db.getAll(sql, params);
    res.json(rows);
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
router.delete('/activity-logs', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM user_activity_logs');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
