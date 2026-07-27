'use strict';
const express = require('express');
const { dbPromise } = require('../database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Read-only dashboard stats — no writes exist in this file. Any logged-in
// role may view.
router.use(['/stats', '/stock-movements'], requireAuth);

// GET /api/stats/monthly-purchases — PO total by month (all available data)
router.get('/stats/monthly-purchases', async (req, res) => {
  try {
    const { db } = await dbPromise;
    // NOTE: this used to pick the query dialect via try/catch, but the SQLite
    // driver (db.js) already catches its own errors internally and returns []
    // instead of throwing — so the Postgres-flavoured query below always
    // silently "succeeded" with an empty result under SQLite (logging
    // '[sqljs] getAll: unrecognized token: ":"' from the `::date` cast) and
    // the SQLite fallback query was never actually reached. Branch on
    // DATABASE_URL explicitly instead so local dev really gets real data.
    let rows;
    if (process.env.DATABASE_URL) {
      rows = await db.getAll(
        `SELECT TO_CHAR(DATE_TRUNC('month', order_date::date), 'Mon YYYY') AS month,
                TO_CHAR(DATE_TRUNC('month', order_date::date), 'YYYY-MM')  AS sort_key,
                SUM(total_amount) AS total
         FROM purchase_orders
         WHERE order_date IS NOT NULL AND order_date <> ''
         GROUP BY DATE_TRUNC('month', order_date::date)
         ORDER BY DATE_TRUNC('month', order_date::date) ASC`
      );
    } else {
      // sql.js's bundled SQLite doesn't support strftime's '%b' (month name)
      // specifier — it silently returns NULL for the whole column instead of
      // erroring, which would have shown blank month labels — so we only ask
      // SQLite for the sortable 'YYYY-MM' key and build the 'Mon YYYY' label
      // in JS instead.
      const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const raw = await db.getAll(
        `SELECT strftime('%Y-%m', order_date) AS sort_key, SUM(total_amount) AS total
         FROM purchase_orders
         WHERE order_date IS NOT NULL AND order_date <> ''
         GROUP BY strftime('%Y-%m', order_date)
         ORDER BY strftime('%Y-%m', order_date) ASC`
      );
      rows = raw.map(r => {
        const [y, m] = String(r.sort_key || '').split('-');
        const mi = parseInt(m, 10) - 1;
        const month = (mi >= 0 && mi < 12) ? `${MONTH_NAMES[mi]} ${y}` : r.sort_key;
        return { month, sort_key: r.sort_key, total: r.total };
      });
    }
    res.json(rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/inventory-status — count by status
router.get('/stats/inventory-status', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll(
      `SELECT status, COUNT(*) AS count FROM products GROUP BY status`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/spare-parts-status — spare parts on_hand vs safety_stock
router.get('/stats/spare-parts-status', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const all = await db.getAll('SELECT on_hand, safety_stock FROM spare_parts');
    const outOfStock = all.filter(r => r.on_hand === 0).length;
    const lowStock   = all.filter(r => r.on_hand > 0 && r.on_hand <= r.safety_stock).length;
    const ok         = all.length - outOfStock - lowStock;
    res.json({ outOfStock, lowStock, ok, total: all.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/goods-received — status summary + recent 5 records
router.get('/stats/goods-received', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const summary = await db.getAll(
      `SELECT status, COUNT(*) AS count FROM goods_received GROUP BY status ORDER BY status`
    );
    const recent = await db.getAll(
      `SELECT gr_number, po_number, supplier, received_date, received_by, status, total_items
       FROM goods_received ORDER BY created_at DESC LIMIT 5`
    );
    const total = summary.reduce((s, r) => s + (+r.count || 0), 0);
    res.json({ summary, recent, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock-movements — recent stock changes
router.get('/stock-movements', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const rows = await db.getAll(
      `SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT ?`, [limit]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
