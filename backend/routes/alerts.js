'use strict';
const express = require('express');
const { dbPromise } = require('../database');
const { pushLine } = require('../utils/lineService');
const { requireAuth, requireWrite } = require('../middleware/auth');
const router = express.Router();

// Alerts send-actions live in Settings (Admin/Manager only); the GET
// stays viewable by any logged-in role.
router.use('/alerts', requireAuth);
const writeGate = requireWrite(false);

// ── Shared low-stock helpers (used by the manual "send" routes below AND by
// the daily scheduler in server.js) ─────────────────────────────────────────
async function getLowStockRows(db) {
  return db.getAll(
    `SELECT name, part_no, machine, on_hand, safety_stock
     FROM spare_parts WHERE on_hand <= safety_stock ORDER BY on_hand ASC`
  );
}

// Philippines (Asia/Manila, UTC+8) "today" as YYYY-MM-DD, computed from UTC so
// it doesn't depend on the server's own timezone setting.
function manilaDateString(d = new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function manilaHour(d = new Date()) {
  return (d.getUTCHours() + 8) % 24;
}

function buildLowStockLineText(rows, dateStr) {
  const shown = rows.slice(0, 20);
  const lines = shown.map(r =>
    `${r.on_hand === 0 ? '🚫' : '⚠️'} ${r.name} (${r.part_no || '—'})\n   On Hand: ${r.on_hand} / Safety: ${r.safety_stock}${r.machine ? ` · ${r.machine}` : ''}`
  );
  const more = rows.length > shown.length ? `\n\n…and ${rows.length - shown.length} more item(s).` : '';
  return `📦 Inventory Management System\n📉 Daily Low-Stock Check — ${dateStr}\n\n${rows.length} item(s) at or below safety stock:\n\n${lines.join('\n\n')}${more}`;
}

// Sends the low-stock list to LINE right now, regardless of schedule/last-sent
// gating — used by the manual "Test Now" button and by the scheduler once
// it's decided it's actually due.
async function sendLowStockLineNow(db) {
  const cfg = await db.getOne('SELECT channel_token, user_id FROM line_config WHERE id=1');
  if (!cfg || !cfg.channel_token || !cfg.user_id) {
    const e = new Error('LINE not configured. Please set your Channel Access Token and User ID in Settings.');
    e.code = 'LINE_NOT_CONFIGURED';
    throw e;
  }
  const rows = await getLowStockRows(db);
  if (!rows.length) return { sent: false, count: 0 };
  const text = buildLowStockLineText(rows, manilaDateString());
  await pushLine(cfg.channel_token, cfg.user_id, [{ type: 'text', text }]);
  return { sent: true, count: rows.length };
}

// Called every few minutes from server.js. Only actually sends once per
// Manila calendar day, and only from 8 AM Manila time onward, and only when
// the "低庫存自動通知" toggle in Settings is on — otherwise it's a no-op.
async function checkAndSendScheduledLowStockLine(db) {
  const cfg = await db.getOne('SELECT * FROM line_config WHERE id=1');
  if (!cfg || !cfg.low_stock_notify || !cfg.channel_token || !cfg.user_id) return;
  const today = manilaDateString();
  if (cfg.low_stock_last_sent === today) return;   // already handled today
  if (manilaHour() < 8) return;                    // wait for the morning
  try {
    await sendLowStockLineNow(db);
  } catch (e) {
    console.error('[low-stock-scheduler]', e.message);
  } finally {
    // Mark today as handled either way — including "nothing was low" or a
    // send failure — so we don't retry every few minutes for the rest of the
    // day; it'll naturally try again tomorrow.
    await db.run(`UPDATE line_config SET low_stock_last_sent=? WHERE id=1`, [today]);
  }
}

// GET /api/alerts/low-stock — list spare parts at or below safety stock
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll(
      `SELECT id, name, part_no, machine, on_hand, safety_stock, on_order
       FROM spare_parts
       WHERE on_hand <= safety_stock
       ORDER BY on_hand ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alerts/low-stock/send — email the low-stock list
router.post('/alerts/low-stock/send', writeGate, async (req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll(
      `SELECT name, part_no, machine, on_hand, safety_stock
       FROM spare_parts WHERE on_hand <= safety_stock ORDER BY on_hand ASC`
    );
    if (!rows.length) return res.json({ message: 'No low-stock items — no email sent.' });

    // Try Resend first, fall back to nodemailer
    const to = req.body.to || process.env.ALERT_EMAIL || process.env.GMAIL_USER || 'rogen.hallarsis29@gmail.com';

    const tableRows = rows.map(r =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 10px">${r.name}</td>
        <td style="padding:6px 10px;color:#666">${r.part_no}</td>
        <td style="padding:6px 10px">${r.machine}</td>
        <td style="padding:6px 10px;font-weight:bold;color:${r.on_hand===0?'#dc2626':'#f59e0b'}">${r.on_hand}</td>
        <td style="padding:6px 10px;color:#666">${r.safety_stock}</td>
      </tr>`
    ).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">&#9888;&#65039; Low Stock Alert</h2>
          <p style="color:#fca5a5;margin:6px 0 0">Perception Gaming — Inventory Management System</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
          <p style="color:#374151">${rows.length} spare part(s) are at or below safety stock level:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:8px 10px;text-align:left">Part Name</th>
                <th style="padding:8px 10px;text-align:left">Part No.</th>
                <th style="padding:8px 10px;text-align:left">Machine</th>
                <th style="padding:8px 10px;text-align:left">On Hand</th>
                <th style="padding:8px 10px;text-align:left">Safety Stock</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p style="margin-top:20px;color:#6b7280;font-size:12px">Sent by Perception Gaming Inventory System &middot; ${new Date().toLocaleString()}</p>
        </div>
      </div>`;

    let sent = false;
    // Try Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Inventory System <onboarding@resend.dev>',
          to, subject: `&#9888;&#65039; Low Stock Alert — ${rows.length} item(s) need attention`,
          html
        });
        sent = true;
      } catch (e) { console.error('[alerts] Resend failed:', e.message); }
    }
    // Fallback: nodemailer
    if (!sent && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to, subject: `Low Stock Alert — ${rows.length} item(s) need attention`, html
      });
      sent = true;
    }

    if (!sent) return res.status(503).json({ error: 'No email provider configured (set RESEND_API_KEY or GMAIL_USER+GMAIL_APP_PASSWORD).' });

    // Log the alert into the one real activity log (the old audit_logs table
    // this used to write to was retired along with the Audit Log page).
    await db.run(
      `INSERT INTO user_activity_logs (username, role, action, section, description) VALUES (?,?,?,?,?)`,
      ['System', '', 'SEND_ALERT', 'Alerts', `Low-stock email alert sent to ${to}: ${rows.length} item(s)`]
    );

    res.json({ message: `Alert sent to ${to} for ${rows.length} item(s).` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alerts/low-stock/send-line — manual "Test Now" button in Settings;
// sends immediately regardless of the daily schedule/last-sent gating.
router.post('/alerts/low-stock/send-line', writeGate, async (req, res) => {
  try {
    const { db } = await dbPromise;
    const result = await sendLowStockLineNow(db);
    if (!result.sent) return res.json({ message: 'No low-stock items — nothing to send.' });
    await db.run(
      `INSERT INTO user_activity_logs (username, role, action, section, description) VALUES (?,?,?,?,?)`,
      ['System', '', 'SEND_ALERT', 'Alerts', `Low-stock LINE alert sent (manual test): ${result.count} item(s)`]
    );
    res.json({ message: `LINE alert sent for ${result.count} item(s).` });
  } catch (err) {
    res.status(err.code === 'LINE_NOT_CONFIGURED' ? 400 : 500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.checkAndSendScheduledLowStockLine = checkAndSendScheduledLowStockLine;
