const express = require('express');
const router  = express.Router();
const { dbPromise } = require('../database');
const { pushLine, broadcastLine, buildCalendarMessage } = require('../utils/lineService');

// -- Helpers --
async function getConfig(db) {
  const row = await db.getOne('SELECT channel_token, user_id, auto_notify FROM line_config WHERE id=1');
  if (!row) return { channel_token: '', user_id: '', auto_notify: 0 };
  return { channel_token: row.channel_token || '', user_id: row.user_id || '', auto_notify: row.auto_notify || 0 };
}

// GET /api/line/config
router.get('/line/config', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const cfg = await getConfig(db);
    res.json({
      token_set  : !!cfg.channel_token,
      user_id    : cfg.user_id,
      auto_notify: !!cfg.auto_notify,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/line/config
router.post('/line/config', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { channel_token, user_id, auto_notify } = req.body;
    await db.run(
      `UPDATE line_config SET channel_token=?,user_id=?,auto_notify=?,updated_at=NOW() WHERE id=1`,
      [channel_token || '', user_id || '', auto_notify ? 1 : 0]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/line/notify — push urgent tasks to a single configured user ID
router.post('/line/notify', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const cfg = await getConfig(db);
    if (!cfg.channel_token || !cfg.user_id) {
      return res.status(400).json({ error: 'LINE not configured. Please set your Channel Access Token and User ID in Settings.' });
    }

    const tasks = req.body.tasks || [];
    if (!tasks.length) return res.status(400).json({ error: 'No tasks to notify.' });

    const today = new Date().toISOString().slice(0, 10);
    const lines = tasks.map(t => {
      const overdue = t.task_date < today;
      const flag    = overdue ? '[OVERDUE]' : t.priority === 'High' ? '[HIGH]' : '[TODAY]';
      return `${flag}  ${t.title}\n  Date: ${t.task_date}  |  ${t.category}  |  ${t.status}`;
    });

    const header = `Inventory Management\nUrgent Task Alert — ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    const body   = lines.join('\n\n');
    const footer = `\n\n${tasks.length} task${tasks.length > 1 ? 's' : ''} need${tasks.length === 1 ? 's' : ''} your attention.`;

    await pushLine(cfg.channel_token, cfg.user_id, [{ type: 'text', text: header + '\n\n' + body + footer }]);
    res.json({ ok: true, sent: tasks.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/line/broadcast — broadcast to ALL friends/followers of the Line Official Account
router.post('/line/broadcast', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const cfg = await getConfig(db);
    if (!cfg.channel_token) {
      return res.status(400).json({ error: 'LINE not configured. Please set your Channel Access Token in Settings.' });
    }

    const { message, tasks } = req.body;

    if (tasks && tasks.length) {
      const today = new Date().toISOString().slice(0, 10);
      const dateLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const header = `🔔 Inventory Management System\n📢 Urgent Task Alert — ${dateLabel}`;
      const lines = tasks.map(t => {
        const overdue  = t.task_date < today;
        const prioFlag = overdue
          ? '🚫 OVERDUE'
          : t.priority === 'High'   ? '🚨 HIGH PRIORITY'
          : t.priority === 'Medium' ? '📋 MEDIUM'
          : '📝 LOW';
        return `${prioFlag}\n📌 ${t.title}\n📅 Date     : ${t.task_date}\n🏷️  Category : ${t.category}\n🔄 Status   : ${t.status}`;
      });
      const footer = `\n⚠️ ${tasks.length} task${tasks.length > 1 ? 's' : ''} require${tasks.length === 1 ? 's' : ''} your attention.`;
      await broadcastLine(cfg.channel_token, [{ type: 'text', text: header + '\n\n' + lines.join('\n\n──────────────\n') + footer }]);
      return res.json({ ok: true, sent: tasks.length });
    }

    if (!message) return res.status(400).json({ error: 'Provide a message or tasks array.' });
    await broadcastLine(cfg.channel_token, [{ type: 'text', text: message }]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/line/test — sends a test broadcast to confirm token works
router.post('/line/test', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const cfg = await getConfig(db);
    if (!cfg.channel_token) {
      return res.status(400).json({ error: 'LINE not configured.' });
    }
    await broadcastLine(cfg.channel_token, [{
      type: 'text',
      text: 'LINE Broadcast Test\n\nYour Inventory Management System is connected to LINE and broadcasting successfully!\n\nAll friends of this Official Account will receive activity calendar notifications.',
    }]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /webhook/line — LINE platform webhook. Must return HTTP 200 immediately.
router.post('/webhook/line', (req, res) => {
  res.sendStatus(200);
  const events = req.body.events || [];
  events.forEach(event => {
    console.log('[LINE webhook] event:', JSON.stringify(event));
  });
});

module.exports = { router, getConfig };
