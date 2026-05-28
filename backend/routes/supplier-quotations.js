'use strict';

/**
 * routes/supplier-quotations.js — Supplier Quotation REST API
 *
 * GET    /api/supplier-quotations        List all quotations (newest first)
 * GET    /api/supplier-quotations/:id    Get a single quotation
 * POST   /api/supplier-quotations        Create a new quotation (multipart/form-data)
 * PUT    /api/supplier-quotations/:id    Update a quotation (multipart/form-data)
 * DELETE /api/supplier-quotations/:id    Delete a quotation (also removes attached file)
 */

const express       = require('express');
const path          = require('path');
const fs            = require('fs');
const multer        = require('multer');
const { dbPromise } = require('../database');
const router        = express.Router();

// ── File upload setup ────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/supplier-quotations');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req,  file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

function removeFile(filename) {
  if (!filename) return;
  try { fs.unlinkSync(path.join(UPLOAD_DIR, filename)); } catch (_) {}
}

// ── GET /api/supplier-quotations/next-quote-number ──────────────
router.get('/supplier-quotations/next-quote-number', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const year = new Date().getFullYear();
    const prefix = `SQ-${year}-`;
    // Find the highest sequence number for the current year
    const rows = await db.getAll(
      `SELECT quote_number FROM supplier_quotations WHERE quote_number LIKE ? ORDER BY quote_number DESC`,
      [prefix + '%']
    );
    let nextSeq = 1;
    if (rows.length > 0) {
      const last = rows[0].quote_number; // e.g. SQ-2026-007
      const seq = parseInt(last.replace(prefix, ''), 10);
      if (!isNaN(seq)) nextSeq = seq + 1;
    }
    const quote_number = prefix + String(nextSeq).padStart(3, '0');
    res.json({ quote_number });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
router.post('/supplier-quotations', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      quote_number, supplier = '', contact_person = '', quote_date = '',
      valid_until = '', items_description = '', unit_price = 0,
      quantity = 0, total_amount = 0, status = 'Pending', remarks = ''
    } = req.body;

    if (!quote_number || !supplier) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({ error: 'Quote number and supplier are required.' });
    }

    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/supplier-quotations/' + req.file.filename : '';

    const id = await db.insert(
      `INSERT INTO supplier_quotations
         (quote_number, supplier, contact_person, quote_date, valid_until,
          items_description, unit_price, quantity, total_amount, status, remarks,
          file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        quote_number.trim(), supplier.trim(), contact_person.trim(),
        quote_date || new Date().toISOString().slice(0, 10),
        valid_until, items_description.trim(),
        +unit_price, +quantity, +total_amount,
        status, remarks.trim(),
        file_name, file_path
      ]
    );
    res.status(201).json(await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [id]));
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    if (err.message && err.message.includes('unique')) {
      return res.status(409).json({ error: 'Quote number already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/supplier-quotations/:id ────────────────────────────
router.put('/supplier-quotations/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM supplier_quotations WHERE id=?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Not found' });

    const {
      quote_number, supplier, contact_person, quote_date, valid_until,
      items_description, unit_price, quantity, total_amount, status, remarks
    } = req.body;

    let file_name = ex.file_name;
    let file_path = ex.file_path;
    if (req.file) {
      removeFile(ex.file_name);
      file_name = req.file.filename;
      file_path = '/uploads/supplier-quotations/' + req.file.filename;
    }

    await db.run(
      `UPDATE supplier_quotations SET
         quote_number=?, supplier=?, contact_person=?, quote_date=?, valid_until=?,
         items_description=?, unit_price=?, quantity=?, total_amount=?, status=?, remarks=?,
         file_name=?, file_path=?, updated_at=NOW()
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
        file_name, file_path,
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
    const ex = await db.getOne('SELECT file_name FROM supplier_quotations WHERE id=?', [+req.params.id]);
    if (ex) removeFile(ex.file_name);
    await db.run('DELETE FROM supplier_quotations WHERE id=?', [+req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
