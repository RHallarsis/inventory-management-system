'use strict';

/**
 * routes/supplier-quotations.js — Supplier Quotation REST API
 *
 * GET    /api/supplier-quotations        List all quotations (newest first)
 * GET    /api/supplier-quotations/:id    Get a single quotation
 * POST   /api/supplier-quotations        Create a new quotation
 * PUT    /api/supplier-quotations/:id    Update a quotation
 * DELETE /api/supplier-quotations/:id    Delete a quotation
 */

const express      = require('express');
const { dbPromise } = require('../database');
const router       = express.Router();

// ── GET /api/supplier-quotations ────────────────────────────────
router.get('/supplier-quotations', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll('SELECT * FROM supplier_quotations ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/supplier-quotations/:id ────────────────────────────
router.get('/supplier-quotations/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/supplier-quotations ───────────────────────────────
router.post('/supplier-quotations', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      quote_number, supplier = '', contact_person = '', quote_date = '',
      valid_until = '', items_description = '', unit_price = 0,
      quantity = 0, total_amount = 0, status = 'Pending', remarks = ''
    } = req.body;

    if (!quote_number || !supplier) {
      return res.status(400).json({ error: 'Quote number and supplier are required.' });
    }

    const id = await db.insert(
      `INSERT INTO supplier_quotations
         (quote_number, supplier, contact_person, quote_date, valid_until,
          items_description, unit_price, quantity, total_amount, status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        quote_number.trim(), supplier.trim(), contact_person.trim(),
        quote_date || new Date().toISOString().slice(0, 10),
        valid_until, items_description.trim(),
        +unit_price, +quantity, +total_amount,
        status, remarks.trim()
      ]
    );
    res.status(201).json(await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [id]));
  } catch (err) {
    if (err.message && err.message.includes('unique')) {
      return res.status(409).json({ error: 'Quote number already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/supplier-quotations/:id ────────────────────────────
router.put('/supplier-quotations/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Not found' });

    const {
      quote_number, supplier, contact_person, quote_date, valid_until,
      items_description, unit_price, quantity, total_amount, status, remarks
    } = req.body;

    await db.run(
      `UPDATE supplier_quotations SET
         quote_number=?, supplier=?, contact_person=?, quote_date=?, valid_until=?,
         items_description=?, unit_price=?, quantity=?, total_amount=?, status=?, remarks=?,
         updated_at=NOW()
       WHERE id=?`,
      [
        (quote_number      !== undefined ? quote_number      : ex.quote_number).trim(),
        (supplier          !== undefined ? supplier          : ex.supplier).trim(),
        (contact_person    !== undefined ? contact_person    : ex.contact_person).trim(),
        quote_date         !== undefined ? quote_date        : ex.quote_date,
        valid_until        !== undefined ? valid_until       : ex.valid_until,
        (items_description !== undefined ? items_description : ex.items_description).trim(),
        unit_price         !== undefined ? +unit_price       : ex.unit_price,
        quantity           !== undefined ? +quantity         : ex.quantity,
        total_amount       !== undefined ? +total_amount     : ex.total_amount,
        status             !== undefined ? status            : ex.status,
        (remarks           !== undefined ? remarks           : ex.remarks).trim(),
        +req.params.id
      ]
    );
    res.json(await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/supplier-quotations/:id ─────────────────────────
router.delete('/supplier-quotations/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM supplier_quotations WHERE id=?', [+req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
