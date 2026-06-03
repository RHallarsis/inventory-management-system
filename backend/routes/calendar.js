const express = require('express');
const router  = express.Router();
const { dbPromise } = require('../database');
const { broadcastLine, buildCalendarMessage } = require('../utils/lineService');

// ── PH Holidays proxy — server-side cache so Railway only fetches once per year ──
const phCache = {};

// GET /api/ph-holidays/:year
router.get('/ph-holidays/:year', async (req, res) => {
  const year = parseInt(req.params.year, 10);
  if (!year || year < 2000 || year > 2100) return res.status(400).json({ error: 'Invalid year' });
  try {
    if (!phCache[year]) {
      const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
      phCache[year] = r.ok ? await r.json() : [];
    }
    res.json(phCache[year]);
  } catch (e) {
    res.json([]); // fail gracefully — calendar still works without holidays
  }
});

// Internal: fire Line broadcast if auto_notify is enabled AND task is High priority (fire-and-forget)
async function notifyLine(db, task, action) {
  try {
    if (task.priority !== 'High') return; // only notify for High priority tasks
    const cfg = await db.getOne('SELECT channel_token, auto_notify FROM line_config WHERE id=1');
    if (!cfg || !cfg.auto_notify || !cfg.channel_token) return;
    await broadcastLine(cfg.channel_token, buildCalendarMessage(task, action));
    console.log('[LINE] Broadcast sent for ' + action + ': "' + task.title + '" (High priority)');
  } catch (err) {
    console.error('[LINE] Broadcast error:', err.message);
  }
}

// GET /api/calendar/tasks  — optionally ?year=2026&month=4
router.get('/calendar/tasks', async (req, res) => {
  try {
    const { db } = await dbPromise;
    let tasks = await db.getAll(
      'SELECT id,task_date,task_end_date,task_time,title,description,category,priority,status,color,created_at,updated_at FROM calendar_tasks ORDER BY task_date ASC, task_time ASC NULLS LAST, created_at ASC'
    );
    const { year, month } = req.query;
    if (year && month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      tasks = tasks.filter(t => t.task_date && t.task_date.startsWith(prefix));
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
    const task = await db.getOne(
      'SELECT id,task_date,task_end_date,task_time,title,description,category,priority,status,color,created_at,updated_at FROM calendar_tasks WHERE id=?',
      [+req.params.id]
    );
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calendar/tasks
router.post('/calendar/tasks', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      task_date, title, task_time = null, task_end_date = null,
      description = '', category = 'General',
      priority = 'Medium', status = 'Pending', color = '#6366f1',
    } = req.body;
    if (!task_date || !title) return res.status(400).json({ error: 'task_date and title are required' });

    const id = await db.insert(
      `INSERT INTO calendar_tasks (task_date,task_end_date,task_time,title,description,category,priority,status,color) VALUES (?,?,?,?,?,?,?,?,?)`,
      [task_date, task_end_date||null, task_time||null, title.trim(), description.trim(), category, priority, status, color]
    );

    const task = { id, task_date, task_end_date, task_time, title: title.trim(), description: description.trim(), category, priority, status, color };
    notifyLine(db, task, 'created');

    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/calendar/tasks/:id
router.put('/calendar/tasks/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      task_date, title, task_time = null, task_end_date = null,
      description = '', category = 'General',
      priority = 'Medium', status = 'Pending', color = '#6366f1',
    } = req.body;
    if (!task_date || !title) return res.status(400).json({ error: 'task_date and title are required' });

    await db.run(
      `UPDATE calendar_tasks SET task_date=?,task_end_date=?,task_time=?,title=?,description=?,category=?,priority=?,status=?,color=?,updated_at=NOW() WHERE id=?`,
      [task_date, task_end_date||null, task_time||null, title.trim(), description.trim(), category, priority, status, color, +req.params.id]
    );

    const task = { id: +req.params.id, task_date, task_end_date, task_time, title: title.trim(), description: description.trim(), category, priority, status, color };
    notifyLine(db, task, 'updated');

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/calendar/tasks/:id
router.delete('/calendar/tasks/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM calendar_tasks WHERE id=?', [+req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
