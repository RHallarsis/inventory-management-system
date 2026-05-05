const express = require('express');
const router  = express.Router();
const { dbPromise } = require('../database');
const { broadcastLine, buildCalendarMessage } = require('../utils/lineService');

const COLS = ['id','task_date','title','description','category','priority','status','color','created_at','updated_at'];
const toObj = row => Object.fromEntries(COLS.map((k, i) => [k, row[i]]));

// Internal: fire Line broadcast if auto_notify is enabled (fire-and-forget)
async function notifyLine(db, task, action) {
  try {
    const cfgRows = db.exec('SELECT channel_token, auto_notify FROM line_config WHERE id=1');
    if (!cfgRows.length || !cfgRows[0].values.length) return;
    const [channel_token, auto_notify] = cfgRows[0].values[0];
    if (!auto_notify || !channel_token) return;
    await broadcastLine(channel_token, buildCalendarMessage(task, action));
    console.log('[LINE] Broadcast sent for ' + action + ': "' + task.title + '"');
  } catch (err) {
    console.error('[LINE] Broadcast error:', err.message);
  }
}

// GET /api/calendar/tasks  — optionally ?year=2026&month=4
router.get('/calendar/tasks', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = db.exec('SELECT id,task_date,title,description,category,priority,status,color,created_at,updated_at FROM calendar_tasks ORDER BY task_date ASC, created_at ASC');
    let tasks = rows.length ? rows[0].values.map(toObj) : [];
    const { year, month } = req.query;
    if (year && month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      tasks = tasks.filter(t => t.task_date.startsWith(prefix));
    }
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendar/tasks/:id
router.get('/calendar/tasks/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = db.exec('SELECT id,task_date,title,description,category,priority,status,color,created_at,updated_at FROM calendar_tasks WHERE id=?', [+req.params.id]);
    if (!rows.length || !rows[0].values.length) return res.status(404).json({ error: 'Not found' });
    res.json(toObj(rows[0].values[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calendar/tasks
router.post('/calendar/tasks', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const {
      task_date, title,
      description = '', category = 'General',
      priority = 'Medium', status = 'Pending', color = '#6366f1',
    } = req.body;
    if (!task_date || !title) return res.status(400).json({ error: 'task_date and title are required' });

    db.run(
      `INSERT INTO calendar_tasks (task_date,title,description,category,priority,status,color) VALUES (?,?,?,?,?,?,?)`,
      [task_date, title.trim(), description.trim(), category, priority, status, color]
    );
    save();

    const idRows = db.exec('SELECT last_insert_rowid()');
    const id = idRows[0].values[0][0];

    // Broadcast to all Line friends (fire-and-forget, never blocks response)
    const task = { id, task_date, title: title.trim(), description: description.trim(), category, priority, status, color };
    notifyLine(db, task, 'created');

    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/calendar/tasks/:id
router.put('/calendar/tasks/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const {
      task_date, title,
      description = '', category = 'General',
      priority = 'Medium', status = 'Pending', color = '#6366f1',
    } = req.body;
    if (!task_date || !title) return res.status(400).json({ error: 'task_date and title are required' });

    db.run(
      `UPDATE calendar_tasks SET task_date=?,title=?,description=?,category=?,priority=?,status=?,color=?,updated_at=datetime('now') WHERE id=?`,
      [task_date, title.trim(), description.trim(), category, priority, status, color, +req.params.id]
    );
    save();

    // Broadcast to all Line friends (fire-and-forget)
    const task = { id: +req.params.id, task_date, title: title.trim(), description: description.trim(), category, priority, status, color };
    notifyLine(db, task, 'updated');

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/calendar/tasks/:id
router.delete('/calendar/tasks/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    db.run('DELETE FROM calendar_tasks WHERE id=?', [+req.params.id]);
    save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
