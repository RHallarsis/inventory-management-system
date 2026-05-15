'use strict';
const express = require('express');
const { dbPromise } = require('../database');
const router = express.Router();

// GET /api/stats/monthly-purchases — PO total by month (all available data)
router.get('/stats/monthly-purchases', async (req, res) => {
  try {
    const { db } = await dbPromise;
    let rows;
    try {
      rows = await db.getAll(
        `SELECT TO_CHAR(DATE_TRUNC('month', order_date::date), 'Mon YYYY') AS month,
                TO_CHAR(DATE_TRUNC('month', order_date::date), 'YYYY-MM')  AS sort_key,
                SUM(total_amount) AS total
         FROM purchase_orders
         WHERE order_date IS NOT NULL AND order_date <> ''
         GROUP BY DATE_TRUNC('month', order_date::date)
         ORDER BY DATE_TRUNC('month', order_date::date) ASC`
      );
    } catch {
      rows = await db.getAll(
        `SELECT strftime('%b %Y', order_date) AS month,
                strftime('%Y-%m', order_date)  AS sort_key,
                SUM(total_amount) AS total
         FROM purchase_orders
         WHERE order_date IS NOT NULL AND order_date <> ''
         GROUP BY strftime('%Y-%m', order_date)
         ORDER BY strftime('%Y-%m', order_date) ASC`
      );
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
