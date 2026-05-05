'use strict';
/**
 * routes/cipl.js
 * CI/PL — Commercial Invoice & Packing List
 * Full CRUD + file upload for both document types.
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { dbPromise } = require('../database');

const router = express.Router();

// ── Upload directory ──────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/cipl');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });
const uploadPL = upload.fields([
  { name: 'file',        maxCount: 1 },
  { name: 'bl_awb_file', maxCount: 1 }
]);

// ─── helper: delete physical file ────────────────────────────
function removeFile(filename) {
  if (!filename) return;
  const p = path.join(UPLOAD_DIR, filename);
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
}

// ════════════════════════════════════════════════════════════════
// COMMERCIAL INVOICES
// ════════════════════════════════════════════════════════════════

// GET all
router.get('/cipl/ci', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll(
      'SELECT * FROM commercial_invoices ORDER BY invoice_date DESC, id DESC'
    ));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET one
router.get('/cipl/ci/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM commercial_invoices WHERE id=?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/cipl/ci', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      ci_number, supplier, invoice_date, currency,
      total_amount, goods_description,
      remarks, status
    } = req.body;

    if (!ci_number || !ci_number.trim())
      return res.status(400).json({ error: 'CI Number is required' });

    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/cipl/' + req.file.filename : '';

    const id = await db.insert(
      `INSERT INTO commercial_invoices
        (ci_number, supplier, invoice_date, currency,
         total_amount, goods_description,
         remarks, status, file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        ci_number.trim(),
        (supplier || '').trim(),
        invoice_date || new Date().toISOString().slice(0, 10),
        currency || 'USD',
        parseFloat(total_amount) || 0,
        (goods_description || '').trim(),
        (remarks || '').trim(),
        status || 'Draft',
        file_name,
        file_path
      ]
    );
    res.status(201).json(
      await db.getOne('SELECT * FROM commercial_invoices WHERE id=?', [id])
    );
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    if (err.message && err.message.includes('unique'))
      return res.status(409).json({ error: 'CI Number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/cipl/ci/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne(
      'SELECT * FROM commercial_invoices WHERE id=?', [+req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const {
      ci_number, supplier, invoice_date, currency,
      total_amount, goods_description,
      remarks, status
    } = req.body;

    let file_name = existing.file_name;
    let file_path = existing.file_path;
    if (req.file) {
      removeFile(existing.file_name);
      file_name = req.file.filename;
      file_path = '/uploads/cipl/' + req.file.filename;
    }

    await db.run(
      `UPDATE commercial_invoices SET
        ci_number=?, supplier=?, invoice_date=?, currency=?,
        total_amount=?, goods_description=?,
        remarks=?, status=?, file_name=?, file_path=?, updated_at=NOW()
       WHERE id=?`,
      [
        (ci_number || existing.ci_number).trim(),
        (supplier !== undefined ? supplier : existing.supplier).trim(),
        invoice_date || existing.invoice_date,
        currency || existing.currency,
        parseFloat(total_amount) || existing.total_amount,
        (goods_description !== undefined ? goods_description : existing.goods_description).trim(),
        (remarks !== undefined ? remarks : existing.remarks).trim(),
        status || existing.status,
        file_name,
        file_path,
        +req.params.id
      ]
    );
    res.json(
      await db.getOne('SELECT * FROM commercial_invoices WHERE id=?', [+req.params.id])
    );
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete('/cipl/ci/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne(
      'SELECT * FROM commercial_invoices WHERE id=?', [+req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });
    removeFile(existing.file_name);
    await db.run('DELETE FROM commercial_invoices WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// PACKING LISTS
// ════════════════════════════════════════════════════════════════

// GET all
router.get('/cipl/pl', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll(
      'SELECT * FROM packing_lists ORDER BY pl_date DESC, id DESC'
    ));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET one
router.get('/cipl/pl/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM packing_lists WHERE id=?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create
router.post('/cipl/pl', uploadPL, async (req, res) => {
  try {
    const { db } = await dbPromise;
    const {
      pl_number, ci_number, shipper, consignee, pl_date,
      bl_awb_number, bl_awb_details,
      total_packages, total_net_weight, total_gross_weight,
      remarks, status
    } = req.body;

    if (!pl_number || !pl_number.trim())
      return res.status(400).json({ error: 'PL Number is required' });

    const genFile    = req.files && req.files['file']        ? req.files['file'][0]        : null;
    const blFile     = req.files && req.files['bl_awb_file'] ? req.files['bl_awb_file'][0] : null;
    const file_name  = genFile ? genFile.filename  : '';
    const file_path  = genFile ? '/uploads/cipl/' + genFile.filename  : '';
    const bl_awb_file_name = blFile ? blFile.filename  : '';
    const bl_awb_file_path = blFile ? '/uploads/cipl/' + blFile.filename : '';

    const id = await db.insert(
      `INSERT INTO packing_lists
        (pl_number, ci_number, shipper, consignee, pl_date,
         bl_awb_number, bl_awb_details, bl_awb_file_name, bl_awb_file_path,
         total_packages, total_net_weight, total_gross_weight,
         remarks, status, file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        pl_number.trim(),
        (ci_number || '').trim(),
        (shipper || '').trim(),
        (consignee || '').trim(),
        pl_date || new Date().toISOString().slice(0, 10),
        (bl_awb_number || '').trim(),
        (bl_awb_details || '').trim(),
        bl_awb_file_name,
        bl_awb_file_path,
        parseInt(total_packages) || 0,
        parseFloat(total_net_weight) || 0,
        parseFloat(total_gross_weight) || 0,
        (remarks || '').trim(),
        status || 'Draft',
        file_name,
        file_path
      ]
    );
    res.status(201).json(
      await db.getOne('SELECT * FROM packing_lists WHERE id=?', [id])
    );
  } catch (err) {
    if (req.files) { Object.values(req.files).flat().forEach(f => removeFile(f.filename)); }
    if (err.message && err.message.includes('unique'))
      return res.status(409).json({ error: 'PL Number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/cipl/pl/:id', uploadPL, async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne(
      'SELECT * FROM packing_lists WHERE id=?', [+req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const {
      pl_number, ci_number, shipper, consignee, pl_date,
      bl_awb_number, bl_awb_details,
      total_packages, total_net_weight, total_gross_weight,
      remarks, status
    } = req.body;

    let file_name = existing.file_name;
    let file_path  = existing.file_path;
    let bl_awb_file_name = existing.bl_awb_file_name || '';
    let bl_awb_file_path = existing.bl_awb_file_path || '';
    const genFile = req.files && req.files['file']        ? req.files['file'][0]        : null;
    const blFile  = req.files && req.files['bl_awb_file'] ? req.files['bl_awb_file'][0] : null;
    if (genFile) { removeFile(existing.file_name); file_name = genFile.filename; file_path = '/uploads/cipl/' + genFile.filename; }
    if (blFile)  { removeFile(existing.bl_awb_file_name); bl_awb_file_name = blFile.filename; bl_awb_file_path = '/uploads/cipl/' + blFile.filename; }

    await db.run(
      `UPDATE packing_lists SET
        pl_number=?, ci_number=?, shipper=?, consignee=?, pl_date=?,
        bl_awb_number=?, bl_awb_details=?, bl_awb_file_name=?, bl_awb_file_path=?,
        total_packages=?, total_net_weight=?, total_gross_weight=?,
        remarks=?, status=?, file_name=?, file_path=?, updated_at=NOW()
       WHERE id=?`,
      [
        (pl_number || existing.pl_number).trim(),
        (ci_number !== undefined ? ci_number : existing.ci_number).trim(),
        (shipper !== undefined ? shipper : existing.shipper).trim(),
        (consignee !== undefined ? consignee : existing.consignee).trim(),
        pl_date || existing.pl_date,
        (bl_awb_number !== undefined ? bl_awb_number : existing.bl_awb_number).trim(),
        (bl_awb_details !== undefined ? bl_awb_details : existing.bl_awb_details || '').trim(),
        bl_awb_file_name,
        bl_awb_file_path,
        parseInt(total_packages) || existing.total_packages,
        parseFloat(total_net_weight) || existing.total_net_weight,
        parseFloat(total_gross_weight) || existing.total_gross_weight,
        (remarks !== undefined ? remarks : existing.remarks).trim(),
        status || existing.status,
        file_name,
        file_path,
        +req.params.id
      ]
    );
    res.json(
      await db.getOne('SELECT * FROM packing_lists WHERE id=?', [+req.params.id])
    );
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete('/cipl/pl/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne(
      'SELECT * FROM packing_lists WHERE id=?', [+req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });
    removeFile(existing.file_name);
    await db.run('DELETE FROM packing_lists WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
