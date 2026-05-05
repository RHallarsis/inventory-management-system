const express = require('express');
const { dbPromise } = require('../database');
const router = express.Router();

// GET /api/local-purchases
router.get('/local-purchases', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll('SELECT * FROM local_purchases ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/local-purchases/:id
router.get('/local-purchases/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM local_purchases WHERE id=?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/local-purchases
router.post('/local-purchases', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { po_number, part_name, supplier = '', qty_ordered = 0, unit_price = 0, total = 0,
            order_date, expected_date = '', status = 'Pending', remarks = '' } = req.body;
    if (!po_number || !part_name) return res.status(400).json({ error: 'PO number and part name are required.' });

    const id = await db.insert(
      `INSERT INTO local_purchases (po_number, part_name, supplier, qty_ordered, unit_price, total, order_date, expected_date, status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [po_number.trim(), part_name.trim(), supplier.trim(), +qty_ordered, +unit_price, +total,
       order_date || new Date().toISOString().slice(0, 10), expected_date, status, remarks.trim()]
    );
    res.status(201).json(await db.getOne('SELECT * FROM local_purchases WHERE id=?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/local-purchases/:id
router.put('/local-purchases/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM local_purchases WHERE id=?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Not found' });

    const { po_number, part_name, supplier, qty_ordered, unit_price, total,
            order_date, expected_date, status, remarks } = req.body;

    await db.run(
      `UPDATE local_purchases SET po_number=?, part_name=?, supplier=?, qty_ordered=?, unit_price=?, total=?,
       order_date=?, expected_date=?, status=?, remarks=?, updated_at=NOW() WHERE id=?`,
      [
        (po_number   || ex.po_number).trim(),
        (part_name   || ex.part_name).trim(),
        (supplier    !== undefined ? supplier : ex.supplier).trim(),
        qty_ordered  !== undefined ? +qty_ordered : ex.qty_ordered,
        unit_price   !== undefined ? +unit_price  : ex.unit_price,
        total        !== undefined ? +total       : ex.total,
        order_date   || ex.order_date,
        expected_date !== undefined ? expected_date : ex.expected_date,
        status       || ex.status,
        remarks      !== undefined ? remarks.trim() : ex.remarks,
        +req.params.id
      ]
    );
    res.json(await db.getOne('SELECT * FROM local_purchases WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/local-purchases/:id
router.delete('/local-purchases/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM local_purchases WHERE id=?', [+req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
