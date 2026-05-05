const express = require('express');
const { dbPromise } = require('../database');
const router = express.Router();

function getOne(db, sql, params) {
  const stmt = db.prepare(sql);
  if (params !== undefined) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getAll(db, sql, params) {
  const stmt = db.prepare(sql);
  if (params !== undefined) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// GET /api/local-purchases
router.get('/local-purchases', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = getAll(db, 'SELECT * FROM local_purchases ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/local-purchases/:id
router.get('/local-purchases/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = getOne(db, 'SELECT * FROM local_purchases WHERE id=?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/local-purchases
router.post('/local-purchases', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const { po_number, part_name, supplier = '', qty_ordered = 0, unit_price = 0, total = 0,
            order_date, expected_date = '', status = 'Pending', remarks = '' } = req.body;
    if (!po_number || !part_name) return res.status(400).json({ error: 'PO number and part name are required.' });
    db.run(
      `INSERT INTO local_purchases (po_number, part_name, supplier, qty_ordered, unit_price, total, order_date, expected_date, status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [po_number.trim(), part_name.trim(), supplier.trim(), +qty_ordered, +unit_price, +total,
       order_date || new Date().toISOString().slice(0,10), expected_date, status, remarks.trim()]
    );
    save();
    const idRows = db.exec('SELECT last_insert_rowid()');
    const id = idRows[0].values[0][0];
    res.status(201).json(getOne(db, 'SELECT * FROM local_purchases WHERE id=?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/local-purchases/:id
router.put('/local-purchases/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const ex = getOne(db, 'SELECT * FROM local_purchases WHERE id=?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Not found' });
    const { po_number, part_name, supplier, qty_ordered, unit_price, total,
            order_date, expected_date, status, remarks } = req.body;
    db.run(
      `UPDATE local_purchases SET po_number=?, part_name=?, supplier=?, qty_ordered=?, unit_price=?, total=?,
       order_date=?, expected_date=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
      [
        (po_number || ex.po_number).trim(),
        (part_name || ex.part_name).trim(),
        (supplier !== undefined ? supplier : ex.supplier).trim(),
        qty_ordered !== undefined ? +qty_ordered : ex.qty_ordered,
        unit_price  !== undefined ? +unit_price  : ex.unit_price,
        total       !== undefined ? +total       : ex.total,
        order_date    || ex.order_date,
        expected_date !== undefined ? expected_date : ex.expected_date,
        status    || ex.status,
        remarks   !== undefined ? remarks.trim() : ex.remarks,
        +req.params.id
      ]
    );
    save();
    res.json(getOne(db, 'SELECT * FROM local_purchases WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/local-purchases/:id
router.delete('/local-purchases/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    db.run('DELETE FROM local_purchases WHERE id=?', [+req.params.id]);
    save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
