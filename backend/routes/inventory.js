const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { dbPromise, calcStatus } = require('../database');
const { sendApprovedPODraft }   = require('../services/outlookDraftService');

const router = express.Router();

// ── Multer setup for PO file uploads ──────────────────────────
const PO_UPLOAD_DIR = path.join(__dirname, '../uploads/po');
if (!fs.existsSync(PO_UPLOAD_DIR)) fs.mkdirSync(PO_UPLOAD_DIR, { recursive: true });

const poStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PO_UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});
const poUpload = multer({ storage: poStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Multer setup for Supplier 2303 file uploads ───────────────
const SUP_UPLOAD_DIR = path.join(__dirname, '../uploads/suppliers');
if (!fs.existsSync(SUP_UPLOAD_DIR)) fs.mkdirSync(SUP_UPLOAD_DIR, { recursive: true });

const supStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUP_UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const supUpload = multer({ storage: supStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── GET /api/inventory ────────────────────────────────────────
router.get('/inventory', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM products ORDER BY product_code ASC'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/inventory/:id ────────────────────────────────────
router.get('/inventory/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM products WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/inventory ───────────────────────────────────────
router.post('/inventory', async (req, res) => {
  const { product_code, name, category, quantity, unit_price } = req.body;

  if (!product_code || !name || !category || quantity == null || unit_price == null) {
    return res.status(400).json({ error: 'product_code, name, category, quantity, and unit_price are required' });
  }

  const qty   = parseInt(quantity, 10);
  const price = parseFloat(unit_price);

  if (isNaN(qty)   || qty   < 0) return res.status(400).json({ error: 'quantity must be a non-negative integer' });
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'unit_price must be a non-negative number' });

  try {
    const { db } = await dbPromise;
    const id = await db.insert(
      'INSERT INTO products (product_code, name, category, quantity, unit_price, status) VALUES (?,?,?,?,?,?)',
      [product_code.trim(), name.trim(), category.trim(), qty, price, calcStatus(qty)]
    );
    res.status(201).json(await db.getOne('SELECT * FROM products WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `product_code '${product_code}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/inventory/:id ────────────────────────────────────
router.put('/inventory/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM products WHERE id = ?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { product_code, name, category, quantity, unit_price } = req.body;
    const qty   = quantity   != null ? parseInt(quantity, 10)  : existing.quantity;
    const price = unit_price != null ? parseFloat(unit_price)  : existing.unit_price;

    if (isNaN(qty)   || qty   < 0) return res.status(400).json({ error: 'quantity must be a non-negative integer' });
    if (isNaN(price) || price < 0) return res.status(400).json({ error: 'unit_price must be a non-negative number' });

    await db.run(
      `UPDATE products
          SET product_code = ?, name = ?, category = ?,
              quantity = ?, unit_price = ?, status = ?,
              updated_at = NOW()
        WHERE id = ?`,
      [
        (product_code ?? existing.product_code).trim(),
        (name         ?? existing.name).trim(),
        (category     ?? existing.category).trim(),
        qty, price, calcStatus(qty),
        +req.params.id,
      ]
    );
    res.json(await db.getOne('SELECT * FROM products WHERE id = ?', [+req.params.id]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'product_code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/inventory/:id ─────────────────────────────────
router.delete('/inventory/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT id FROM products WHERE id = ?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    await db.run('DELETE FROM products WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// SPARE PARTS CRUD
// ════════════════════════════════════════════════════════════════

function calcSpareFields(r) {
  const mu  = +(r.monthly_usage) || 0;
  const lt  = +(r.lead_time)     || 0;
  const buf = +(r.buffer)        || 3;
  const ss  = +(r.safety_stock)  || 1;
  const reorder_point = Math.ceil(mu * (lt + buf + ss));
  const net_available = (+(r.on_hand) || 0) + (+(r.on_order) || 0);
  const reorder_qty   = Math.max(0, reorder_point - net_available);
  const order_now     = net_available < reorder_point;
  return { ...r, reorder_point, net_available, reorder_qty, order_now };
}

// ── GET /api/spare-parts ──────────────────────────────────────
router.get('/spare-parts', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const rows = await db.getAll('SELECT * FROM spare_parts ORDER BY id ASC');
    res.json(rows.map(calcSpareFields));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/spare-parts/:id ──────────────────────────────────
router.get('/spare-parts/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM spare_parts WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Spare part not found' });
    res.json(calcSpareFields(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/spare-parts ─────────────────────────────────────
router.post('/spare-parts', async (req, res) => {
  const { name, part_no, machine, on_hand, on_order, monthly_usage, lead_time, buffer, safety_stock } = req.body;
  if (!name || !part_no) return res.status(400).json({ error: 'name and part_no are required' });
  try {
    const { db } = await dbPromise;
    const id = await db.insert(
      `INSERT INTO spare_parts (name, part_no, machine, on_hand, on_order, monthly_usage, lead_time, buffer, safety_stock)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        name.trim(), part_no.trim(), (machine || '').trim(),
        +on_hand || 0, +on_order || 0, +monthly_usage || 0,
        +lead_time || 0, +buffer || 3, +safety_stock || 1
      ]
    );
    res.status(201).json(await db.getOne('SELECT * FROM spare_parts WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `part_no '${part_no}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/spare-parts/:id ──────────────────────────────────
router.put('/spare-parts/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM spare_parts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Spare part not found' });
    const { name, part_no, machine, on_hand, on_order, monthly_usage, lead_time, buffer, safety_stock } = req.body;
    await db.run(
      `UPDATE spare_parts
          SET name=?, part_no=?, machine=?, on_hand=?, on_order=?,
              monthly_usage=?, lead_time=?, buffer=?, safety_stock=?,
              updated_at=NOW()
        WHERE id=?`,
      [
        (name    ?? ex.name).trim(),
        (part_no ?? ex.part_no).trim(),
        (machine ?? ex.machine).trim(),
        on_hand       != null ? +on_hand       : ex.on_hand,
        on_order      != null ? +on_order      : ex.on_order,
        monthly_usage != null ? +monthly_usage : ex.monthly_usage,
        lead_time     != null ? +lead_time     : ex.lead_time,
        buffer        != null ? +buffer        : ex.buffer,
        safety_stock  != null ? +safety_stock  : ex.safety_stock,
        +req.params.id
      ]
    );
    res.json(await db.getOne('SELECT * FROM spare_parts WHERE id = ?', [+req.params.id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'part_no already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/spare-parts/:id ───────────────────────────────
router.delete('/spare-parts/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM spare_parts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Spare part not found' });
    await db.run('DELETE FROM spare_parts WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/stats ────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne(`
      SELECT
        COUNT(*)                                                           AS "totalProducts",
        SUM(CASE WHEN quantity > 0 AND quantity <= 10 THEN 1 ELSE 0 END)  AS "lowStockItems",
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END)                     AS "outOfStock",
        ROUND(SUM(quantity * unit_price)::numeric, 2)                     AS "totalValue"
      FROM products
    `);
    res.json({
      totalProducts:      row ? +row.totalProducts      : 0,
      lowStockItems:      row ? +row.lowStockItems      : 0,
      outOfStock:         row ? +row.outOfStock         : 0,
      totalValue:         row ? +(row.totalValue ?? 0)  : 0,
      itemsSoldThisMonth: 340,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// CATEGORIES CRUD
// ════════════════════════════════════════════════════════════════

router.get('/categories', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const cats = await db.getAll('SELECT * FROM categories ORDER BY name ASC');

    const result = await Promise.all(cats.map(async cat => {
      const spQty = await db.scalar(
        `SELECT COUNT(*) FROM spare_parts
         WHERE ',' || TRIM(REPLACE(REPLACE(REPLACE(machine,' & ',','),', ',','),' and ',',')) || ','
               LIKE '%,' || ? || ',%'`,
        [cat.name]
      );
      const prQty = await db.scalar(
        'SELECT COUNT(*) FROM products WHERE LOWER(category) = LOWER(?)',
        [cat.name]
      );
      return { ...cat, quantity: spQty + prQty };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM categories WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Category not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/categories', async (req, res) => {
  const { name, specification, quantity } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { db } = await dbPromise;
    const id = await db.insert(
      'INSERT INTO categories (name, specification, quantity) VALUES (?,?,?)',
      [name.trim(), (specification || '').trim(), +quantity || 0]
    );
    res.status(201).json(await db.getOne('SELECT * FROM categories WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Category '${name}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM categories WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Category not found' });
    const { name, specification, quantity } = req.body;
    await db.run(
      `UPDATE categories SET name=?, specification=?, quantity=?, updated_at=NOW() WHERE id=?`,
      [(name ?? ex.name).trim(), (specification ?? ex.specification).trim(), +(quantity ?? ex.quantity), +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM categories WHERE id = ?', [+req.params.id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM categories WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Category not found' });
    await db.run('DELETE FROM categories WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SUPPLIERS CRUD
// ════════════════════════════════════════════════════════════════

router.get('/suppliers', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM suppliers ORDER BY name ASC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/suppliers/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM suppliers WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Supplier not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/suppliers', supUpload.single('file_2303'), async (req, res) => {
  const { code, name, contact_person, role, email, phone, category, location, status } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'code and name are required' });
  try {
    const { db } = await dbPromise;
    const file_2303_name = req.file ? req.file.originalname : '';
    const file_2303_path = req.file ? '/uploads/suppliers/' + req.file.filename : '';
    const id = await db.insert(
      'INSERT INTO suppliers (code, name, contact_person, role, email, phone, category, location, status, file_2303_name, file_2303_path) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [code.trim(), name.trim(), (contact_person || '').trim(), (role || '').trim(),
       (email || '').trim(), (phone || '').trim(), (category || '').trim(),
       (location || '').trim(), status || 'Active', file_2303_name, file_2303_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM suppliers WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Supplier code '${code}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/suppliers/:id', supUpload.single('file_2303'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM suppliers WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Supplier not found' });
    const { code, name, contact_person, role, email, phone, category, location, status } = req.body;
    let file_2303_name = ex.file_2303_name || '';
    let file_2303_path = ex.file_2303_path || '';
    if (req.file) {
      if (ex.file_2303_name) {
        const old = path.join(SUP_UPLOAD_DIR, ex.file_2303_name);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      file_2303_name = req.file.originalname;
      file_2303_path = '/uploads/suppliers/' + req.file.filename;
    }
    await db.run(
      `UPDATE suppliers SET code=?, name=?, contact_person=?, role=?, email=?, phone=?, category=?, location=?, status=?, file_2303_name=?, file_2303_path=?, updated_at=NOW() WHERE id=?`,
      [(code ?? ex.code).trim(), (name ?? ex.name).trim(),
       (contact_person ?? ex.contact_person).trim(), (role ?? ex.role).trim(),
       (email ?? ex.email).trim(), (phone ?? ex.phone).trim(),
       (category ?? ex.category).trim(), (location ?? ex.location).trim(),
       status ?? ex.status, file_2303_name, file_2303_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM suppliers WHERE id = ?', [+req.params.id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Supplier code already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM suppliers WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Supplier not found' });
    await db.run('DELETE FROM suppliers WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// PURCHASE ORDERS CRUD
// ════════════════════════════════════════════════════════════════

router.get('/purchase-orders', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM purchase_orders ORDER BY order_date DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/purchase-orders', poUpload.single('file'), async (req, res) => {
  const { po_number, supplier, order_date, status, total_amount } = req.body;
  if (!po_number || !supplier) return res.status(400).json({ error: 'po_number and supplier are required' });
  try {
    const { db } = await dbPromise;
    const fileName = req.file ? req.file.filename : null;
    const filePath = req.file ? `/uploads/po/${req.file.filename}` : null;
    const id = await db.insert(
      'INSERT INTO purchase_orders (po_number, supplier, order_date, status, total_amount, file_name, file_path) VALUES (?,?,?,?,?,?,?)',
      [po_number.trim(), supplier.trim(), order_date || new Date().toISOString().split('T')[0],
       status || 'Pending', +total_amount || 0, fileName, filePath]
    );
    res.status(201).json(await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `PO number '${po_number}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/purchase-orders/:id', poUpload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Purchase order not found' });
    const { po_number, supplier, order_date, status, total_amount } = req.body;
    let fileName = ex.file_name;
    let filePath = ex.file_path;
    if (req.file) {
      if (ex.file_path) {
        const oldFile = path.join(__dirname, '..', ex.file_path);
        try { fs.unlinkSync(oldFile); } catch (e) { /* ignore */ }
      }
      fileName = req.file.filename;
      filePath = `/uploads/po/${req.file.filename}`;
    }

    // Detect if status is transitioning to 'Approved'
    const newStatus   = status ?? ex.status;
    const justApproved = ex.status !== 'Approved' && newStatus === 'Approved';

    await db.run(
      `UPDATE purchase_orders SET po_number=?, supplier=?, order_date=?, status=?, total_amount=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(po_number ?? ex.po_number).trim(), (supplier ?? ex.supplier).trim(),
       order_date ?? ex.order_date, newStatus,
       total_amount != null ? +total_amount : ex.total_amount,
       fileName, filePath, +req.params.id]
    );

    const updatedPO = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);

    // Auto-create Outlook draft when PO is approved
    if (justApproved) {
      try {
        const supplierRecord = await db.getOne(
          'SELECT email FROM suppliers WHERE LOWER(name) = LOWER(?)',
          [updatedPO.supplier]
        );
        await sendApprovedPODraft({
          po_number:      updatedPO.po_number,
          order_date:     updatedPO.order_date,
          supplier_name:  updatedPO.supplier,
          supplier_email: supplierRecord?.email || '',
          total_amount:   updatedPO.total_amount,
        });
      } catch (emailErr) {
        // Log but don't fail the PO update if email draft fails
        console.error('[PO Email] Failed to create Outlook draft:', emailErr.message);
      }
    }

    res.json(updatedPO);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'PO number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── Preview email content for an approved PO (no send) ────────
router.get('/purchase-orders/:id/preview-email', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const po = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    const supplierRecord = await db.getOne(
      'SELECT email FROM suppliers WHERE LOWER(name) = LOWER(?)', [po.supplier]
    );
    const supplierEmail = supplierRecord?.email || '';
    // Build preview HTML inline (same as the email body)
    const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const bodyHtml = `
<div style="font-family:Arial,sans-serif;color:#333;max-width:680px;">
  <div style="background:#6b2e0a;padding:18px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">Purchase Order Approved</h2>
    <p style="color:#f5c88a;margin:4px 0 0;font-size:0.9rem;">PO # ${po.po_number} &mdash; ${po.order_date}</p>
  </div>
  <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:22px;border-radius:0 0 8px 8px;">
    <p>Dear <strong>${po.supplier}</strong>,</p>
    <p>We are pleased to inform you that the following Purchase Order has been <strong>approved</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:0.88rem;">
      <tr style="background:#f5f5f5;"><td style="padding:9px;font-weight:bold;width:40%;">PO Number</td><td style="padding:9px;">${po.po_number}</td></tr>
      <tr><td style="padding:9px;font-weight:bold;">Order Date</td><td style="padding:9px;">${po.order_date}</td></tr>
      <tr style="background:#f5f5f5;"><td style="padding:9px;font-weight:bold;">Supplier</td><td style="padding:9px;">${po.supplier}</td></tr>
      <tr><td style="padding:9px;font-weight:bold;">Total Amount</td><td style="padding:9px;color:#6b2e0a;font-weight:bold;">Php ${fmt(po.total_amount)}</td></tr>
    </table>
    <p>Please confirm receipt and provide an expected delivery schedule at your earliest convenience.</p>
    <p>Thank you for your continued partnership.</p>
    <p style="font-size:0.75rem;color:#999;margin-top:20px;">This is an automated notification from the Inventory Management System.</p>
  </div>
</div>`;
    res.json({
      po_number:      po.po_number,
      supplier_name:  po.supplier,
      supplier_email: supplierEmail,
      subject:        `Purchase Order Approved – ${po.po_number} | ${po.supplier}`,
      body_html:      bodyHtml,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manually notify supplier for an approved PO ───────────────
router.post('/purchase-orders/:id/notify-supplier', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const po = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status !== 'Approved') {
      return res.status(400).json({ error: 'PO must be Approved before notifying supplier.' });
    }
    const supplierRecord = await db.getOne(
      'SELECT email FROM suppliers WHERE LOWER(name) = LOWER(?)', [po.supplier]
    );
    const supplierEmail = supplierRecord?.email || '';
    if (!supplierEmail) {
      return res.status(400).json({ error: `No email address found for supplier "${po.supplier}". Please add it in the Suppliers section first.` });
    }
    await sendApprovedPODraft({
      po_number:     po.po_number,
      order_date:    po.order_date,
      supplier_name: po.supplier,
      supplier_email: supplierEmail,
      total_amount:  po.total_amount,
    });
    res.json({ success: true, message: `Notification sent to ${supplierEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Purchase order not found' });
    await db.run('DELETE FROM purchase_orders WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// GOODS RECEIVED CRUD
// ════════════════════════════════════════════════════════════════

router.get('/goods-received', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM goods_received ORDER BY received_date DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/goods-received', async (req, res) => {
  const { gr_number, po_number, supplier, received_date, received_by, status, total_items } = req.body;
  if (!gr_number || !supplier) return res.status(400).json({ error: 'gr_number and supplier are required' });
  try {
    const { db } = await dbPromise;
    const id = await db.insert(
      'INSERT INTO goods_received (gr_number, po_number, supplier, received_date, received_by, status, total_items) VALUES (?,?,?,?,?,?,?)',
      [gr_number.trim(), (po_number || '').trim(), supplier.trim(),
       received_date || new Date().toISOString().split('T')[0],
       (received_by || '').trim(), status || 'Pending', +total_items || 0]
    );
    res.status(201).json(await db.getOne('SELECT * FROM goods_received WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `GR number '${gr_number}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/goods-received/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM goods_received WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Goods received record not found' });
    const { gr_number, po_number, supplier, received_date, received_by, status, total_items } = req.body;
    await db.run(
      `UPDATE goods_received SET gr_number=?, po_number=?, supplier=?, received_date=?, received_by=?, status=?, total_items=?, updated_at=NOW() WHERE id=?`,
      [(gr_number ?? ex.gr_number).trim(), (po_number ?? ex.po_number).trim(),
       (supplier ?? ex.supplier).trim(), received_date ?? ex.received_date,
       (received_by ?? ex.received_by).trim(), status ?? ex.status,
       total_items != null ? +total_items : ex.total_items, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM goods_received WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/goods-received/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM goods_received WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Record not found' });
    await db.run('DELETE FROM goods_received WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// STOCK TRANSFERS CRUD
// ════════════════════════════════════════════════════════════════

router.get('/stock-transfers', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM stock_transfers ORDER BY transfer_date DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stock-transfers', async (req, res) => {
  const { transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by } = req.body;
  if (!transfer_no || !source_location || !destination_location) {
    return res.status(400).json({ error: 'transfer_no, source_location, and destination_location are required' });
  }
  try {
    const { db } = await dbPromise;
    const id = await db.insert(
      'INSERT INTO stock_transfers (transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by) VALUES (?,?,?,?,?,?,?)',
      [transfer_no.trim(), transfer_date || new Date().toISOString().split('T')[0],
       source_location.trim(), destination_location.trim(),
       +items_count || 0, status || 'Pending', (transferred_by || '').trim()]
    );
    res.status(201).json(await db.getOne('SELECT * FROM stock_transfers WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Transfer No '${transfer_no}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/stock-transfers/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM stock_transfers WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Stock transfer not found' });
    const { transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by } = req.body;
    await db.run(
      `UPDATE stock_transfers SET transfer_no=?, transfer_date=?, source_location=?, destination_location=?, items_count=?, status=?, transferred_by=?, updated_at=NOW() WHERE id=?`,
      [(transfer_no ?? ex.transfer_no).trim(), transfer_date ?? ex.transfer_date,
       (source_location ?? ex.source_location).trim(), (destination_location ?? ex.destination_location).trim(),
       items_count != null ? +items_count : ex.items_count, status ?? ex.status,
       (transferred_by ?? ex.transferred_by).trim(), +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM stock_transfers WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/stock-transfers/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM stock_transfers WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Stock transfer not found' });
    await db.run('DELETE FROM stock_transfers WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// MACHINE MONITORING CRUD
// ════════════════════════════════════════════════════════════════

router.get('/machine-monitoring', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM machine_monitoring ORDER BY total DESC, site ASC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/machine-monitoring/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const row = await db.getOne('SELECT * FROM machine_monitoring WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function mmTotal(r) {
  return (+r.ez || 0) + (+r.br || 0) + (+r.ez2 || 0) + (+r.ezl || 0) + (+r.lb || 0) + (+r.j_ark || 0);
}

router.post('/machine-monitoring', async (req, res) => {
  const { site, group_name, area, ez, br, ez2, ezl, lb, j_ark } = req.body;
  if (!site || !area) return res.status(400).json({ error: 'site and area are required' });
  try {
    const { db } = await dbPromise;
    const total = mmTotal({ ez, br, ez2, ezl, lb, j_ark });
    const grp   = group_name ? group_name.trim() : area.trim();
    const id = await db.insert(
      'INSERT INTO machine_monitoring (site, group_name, area, ez, br, ez2, ezl, lb, j_ark, total) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [site.trim(), grp, area.trim(), +ez || 0, +br || 0, +ez2 || 0, +ezl || 0, +lb || 0, +j_ark || 0, total]
    );
    res.status(201).json(await db.getOne('SELECT * FROM machine_monitoring WHERE id = ?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/machine-monitoring/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM machine_monitoring WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Record not found' });
    const { site, group_name, area, ez, br, ez2, ezl, lb, j_ark } = req.body;
    const nr = {
      ez:    ez    != null ? +ez    : ex.ez,
      br:    br    != null ? +br    : ex.br,
      ez2:   ez2   != null ? +ez2   : ex.ez2,
      ezl:   ezl   != null ? +ezl   : ex.ezl,
      lb:    lb    != null ? +lb    : ex.lb,
      j_ark: j_ark != null ? +j_ark : ex.j_ark
    };
    const total  = mmTotal(nr);
    const newArea = area       ? area.trim()       : ex.area;
    const newGrp  = group_name ? group_name.trim() : ex.group_name;
    await db.run(
      `UPDATE machine_monitoring SET site=?, group_name=?, area=?, ez=?, br=?, ez2=?, ezl=?, lb=?, j_ark=?, total=?, updated_at=NOW() WHERE id=?`,
      [(site ?? ex.site).trim(), newGrp, newArea,
       nr.ez, nr.br, nr.ez2, nr.ezl, nr.lb, nr.j_ark, total, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM machine_monitoring WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/machine-monitoring/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM machine_monitoring WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Record not found' });
    await db.run('DELETE FROM machine_monitoring WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
