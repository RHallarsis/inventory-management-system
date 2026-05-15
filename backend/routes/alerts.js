'use strict';
const express = require('express');
const { dbPromise } = require('../database');
const router = express.Router();

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
router.post('/alerts/low-stock/send', async (req, res) => {
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

    // Log the alert
    await db.run(
      `INSERT INTO audit_logs (user_name, user_email, action, entity, entity_id, details) VALUES (?,?,?,?,?,?)`,
      ['System', to, 'SEND_ALERT', 'spare_parts', null, `Low-stock alert sent: ${rows.length} item(s)`]
    );

    res.json({ message: `Alert sent to ${to} for ${rows.length} item(s).` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
