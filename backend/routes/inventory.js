const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { dbPromise, calcStatus } = require('../database');
// Lazy-load email service so a missing/slow module never blocks startup
let sendApprovedPODraft = async () => {};
try { ({ sendApprovedPODraft } = require('../services/outlookDraftService')); }
catch (e) { console.warn('[inventory] outlookDraftService unavailable:', e.message); }

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

// ── Multer setup for Sales Invoice file uploads ───────────────
const SI_UPLOAD_DIR = path.join(__dirname, '../uploads/si');
fs.mkdirSync(SI_UPLOAD_DIR, { recursive: true });
const siStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SI_UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const siUpload = multer({ storage: siStorage, limits: { fileSize: 20 * 1024 * 1024 } });

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
    const created = await db.getOne('SELECT * FROM products WHERE id = ?', [id]);
    // Audit log — product created
    try {
      await db.run(
        `INSERT INTO audit_logs (user_name, user_email, action, entity, entity_id, details) VALUES (?,?,?,?,?,?)`,
        ['System', '', 'CREATE', 'product', id, `Added ${name.trim()} (${product_code.trim()}) qty=${qty}`]
      );
    } catch (_) {}
    // Stock movement — initial stock
    if (qty > 0) {
      try {
        await db.run(
          `INSERT INTO stock_movements (product_id, product_name, product_code, prev_qty, new_qty, change_qty, reason, user_name) VALUES (?,?,?,?,?,?,?,?)`,
          [id, name.trim(), product_code.trim(), 0, qty, qty, 'Initial stock', 'System']
        );
      } catch (_) {}
    }
    res.status(201).json(created);
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

    const newCode = (product_code ?? existing.product_code).trim();
    const newName = (name         ?? existing.name).trim();
    const newCat  = (category     ?? existing.category).trim();

    await db.run(
      `UPDATE products
          SET product_code = ?, name = ?, category = ?,
              quantity = ?, unit_price = ?, status = ?,
              updated_at = NOW()
        WHERE id = ?`,
      [newCode, newName, newCat, qty, price, calcStatus(qty), +req.params.id]
    );

    // Stock movement — if quantity changed
    if (qty !== existing.quantity) {
      try {
        await db.run(
          `INSERT INTO stock_movements (product_id, product_name, product_code, prev_qty, new_qty, change_qty, reason, user_name) VALUES (?,?,?,?,?,?,?,?)`,
          [+req.params.id, newName, newCode, existing.quantity, qty, qty - existing.quantity, 'Manual update', 'System']
        );
      } catch (_) {}
    }
    // Audit log — product updated
    try {
      const changes = [];
      if (qty !== existing.quantity) changes.push(`qty: ${existing.quantity} -> ${qty}`);
      if (price !== existing.unit_price) changes.push(`price: ${existing.unit_price} -> ${price}`);
      if (newCode !== existing.product_code) changes.push(`code: ${existing.product_code} -> ${newCode}`);
      if (newName !== existing.name) changes.push(`name: ${existing.name} -> ${newName}`);
      if (newCat  !== existing.category) changes.push(`category: ${existing.category} -> ${newCat}`);
      await db.run(
        `INSERT INTO audit_logs (user_name, user_email, action, entity, entity_id, details) VALUES (?,?,?,?,?,?)`,
        ['System', '', 'UPDATE', 'product', +req.params.id, changes.length ? changes.join('; ') : 'No field changes']
      );
    } catch (_) {}

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
    // Strip display-name format "Name <email>" → plain email address
    const rawEmail = supplierRecord?.email || '';
    const emailMatch = rawEmail.match(/<([^>]+)>/);
    const supplierEmail = emailMatch ? emailMatch[1].trim() : rawEmail.trim();
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
      po_number:       po.po_number,
      supplier_name:   po.supplier,
      supplier_email:  supplierEmail,
      subject:         `Purchase Order Approved – ${po.po_number} | ${po.supplier}`,
      body_html:       bodyHtml,
      has_attachment:  !!(po.file_name && po.file_path),
      attachment_name: po.file_name || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manually notify supplier for an approved PO ───────────────
// Body: { to: 'override@email.com' }  — optional recipient override
router.post('/purchase-orders/:id/notify-supplier', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const po = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status !== 'Approved') {
      return res.status(400).json({ error: 'PO must be Approved before notifying supplier.' });
    }
    // Use the email provided in the request body (from the editable To: field),
    // falling back to the supplier record in the DB.
    // Strip display-name format "Name <email@domain.com>" → "email@domain.com"
    const parseEmail = (raw = '') => {
      const match = raw.trim().match(/<([^>]+)>/);
      return match ? match[1].trim() : raw.trim();
    };
    let recipientEmail = parseEmail(req.body?.to || '');
    if (!recipientEmail) {
      const supplierRecord = await db.getOne(
        'SELECT email FROM suppliers WHERE LOWER(name) = LOWER(?)', [po.supplier]
      );
      recipientEmail = supplierRecord?.email || '';
    }
    if (!recipientEmail) {
      return res.status(400).json({ error: `No email address provided. Please enter one in the To: field.` });
    }
    // Build absolute path to the PO attachment
    // Try two locations: backend/uploads (volume mount) and relative to routes dir
    let attachmentPath = null;
    if (po.file_path) {
      const candidates = [
        path.join(__dirname, '..', po.file_path),                     // /backend/uploads/po/...
        path.join(__dirname, '../..', po.file_path),                  // /uploads/po/...
        path.join('/app', po.file_path),                              // /app/uploads/po/...
        path.join('/app/backend', po.file_path),                      // /app/backend/uploads/po/...
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) { attachmentPath = candidate; break; }
      }
      console.log(`[PO Notify] file_path="${po.file_path}" resolved="${attachmentPath || 'NOT FOUND'}"`);
    }
    const ccRaw  = (req.body?.cc  || '').trim();
    const bccRaw = (req.body?.bcc || '').trim();
    console.log(`[PO Notify] to="${req.body?.to}" cc="${ccRaw}" bcc="${bccRaw}"`);
    await sendApprovedPODraft({
      po_number:       po.po_number,
      order_date:      po.order_date,
      supplier_name:   po.supplier,
      supplier_email:  recipientEmail,
      total_amount:    po.total_amount,
      attachment_path: attachmentPath,
      attachment_name: po.file_name || null,
      cc:              ccRaw  || null,
      bcc:             bccRaw || null,
    });
    res.json({ success: true, message: `Notification sent to ${recipientEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update SI submitted date and/or SI file ───────────────────
router.patch('/purchase-orders/:id/si', siUpload.single('si_file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Purchase order not found' });

    const si_submitted_date = req.body?.si_submitted_date ?? ex.si_submitted_date;
    let si_file_name = ex.si_file_name;
    let si_file_path = ex.si_file_path;

    if (req.file) {
      // Remove old SI file if present
      if (ex.si_file_path) {
        try { fs.unlinkSync(path.join(__dirname, '..', ex.si_file_path)); } catch (_) {}
      }
      si_file_name = req.file.filename;
      si_file_path = `/uploads/si/${req.file.filename}`;
    }

    await db.run(
      `UPDATE purchase_orders SET si_submitted_date=?, si_file_name=?, si_file_path=?, updated_at=NOW() WHERE id=?`,
      [si_submitted_date || null, si_file_name || null, si_file_path || null, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Remove SI file only ───────────────────────────────────────
router.delete('/purchase-orders/:id/si', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Purchase order not found' });
    if (ex.si_file_path) {
      try { fs.unlinkSync(path.join(__dirname, '..', ex.si_file_path)); } catch (_) {}
    }
    await db.run(
      `UPDATE purchase_orders SET si_file_name=NULL, si_file_path=NULL, updated_at=NOW() WHERE id=?`,
      [+req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM purchase_orders WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    res.json(await db.getAll('SELECT * FROM goods_received ORDER BY id DESC'));
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

// ── Multer setup for Delivery Receipts (stock_transfers) ─────────
const ST_UPLOAD_DIR = path.join(__dirname, '../uploads/stock-transfers');
if (!fs.existsSync(ST_UPLOAD_DIR)) fs.mkdirSync(ST_UPLOAD_DIR, { recursive: true });
const stStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ST_UPLOAD_DIR),
  filename:    (_req, file, cb) => { const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); cb(null, `${Date.now()}-${safe}`); }
});
const stUpload = multer({ storage: stStorage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/stock-transfers', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll("SELECT * FROM stock_transfers ORDER BY CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(transfer_no, '-', 2), '[^0-9]', '', 'g'), '') AS INTEGER) DESC NULLS LAST"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stock-transfers', stUpload.single('file'), async (req, res) => {
  const { transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by } = req.body;
  if (!transfer_no || !source_location || !destination_location) {
    return res.status(400).json({ error: 'transfer_no, source_location, and destination_location are required' });
  }
  try {
    const { db } = await dbPromise;
    const file_name = req.file ? req.file.originalname : '';
    const file_path = req.file ? '/uploads/stock-transfers/' + req.file.filename : '';
    const id = await db.insert(
      'INSERT INTO stock_transfers (transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by, file_name, file_path) VALUES (?,?,?,?,?,?,?,?,?)',
      [transfer_no.trim(), transfer_date || new Date().toISOString().split('T')[0],
       source_location.trim(), destination_location.trim(),
       (items_count || '').trim(), status || 'Pending', (transferred_by || '').trim(),
       file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM stock_transfers WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Transfer No '${transfer_no}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/stock-transfers/:id', stUpload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM stock_transfers WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Stock transfer not found' });
    const { transfer_no, transfer_date, source_location, destination_location, items_count, status, transferred_by } = req.body;
    let file_name = ex.file_name || '';
    let file_path = ex.file_path || '';
    if (req.file) {
      if (ex.file_name) { try { fs.unlinkSync(path.join(ST_UPLOAD_DIR, ex.file_name)); } catch {} }
      file_name = req.file.originalname;
      file_path = '/uploads/stock-transfers/' + req.file.filename;
    }
    await db.run(
      `UPDATE stock_transfers SET transfer_no=?, transfer_date=?, source_location=?, destination_location=?, items_count=?, status=?, transferred_by=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(transfer_no ?? ex.transfer_no).trim(), transfer_date ?? ex.transfer_date,
       (source_location ?? ex.source_location).trim(), (destination_location ?? ex.destination_location).trim(),
       items_count != null ? (items_count || '').trim() : ex.items_count, status ?? ex.status,
       (transferred_by ?? ex.transferred_by).trim(), file_name, file_path, +req.params.id]
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

// ── Multer setup for Pullout Receipts ────────────────────────────
const PULL_UPLOAD_DIR = path.join(__dirname, '../uploads/pullout');
if (!fs.existsSync(PULL_UPLOAD_DIR)) fs.mkdirSync(PULL_UPLOAD_DIR, { recursive: true });
const pullStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PULL_UPLOAD_DIR),
  filename:    (_req, file, cb) => { const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); cb(null, `${Date.now()}-${safe}`); }
});
const pullUpload = multer({ storage: pullStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Multer setup for Transmittal Receipts ─────────────────────────
const TRMIT_UPLOAD_DIR = path.join(__dirname, '../uploads/transmittal');
if (!fs.existsSync(TRMIT_UPLOAD_DIR)) fs.mkdirSync(TRMIT_UPLOAD_DIR, { recursive: true });
const trmitStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TRMIT_UPLOAD_DIR),
  filename:    (_req, file, cb) => { const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); cb(null, `${Date.now()}-${safe}`); }
});
const trmitUpload = multer({ storage: trmitStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── PULLOUT RECEIPTS ─────────────────────────────────────────────
router.get('/pullout-receipts', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll("SELECT * FROM pullout_receipts ORDER BY CAST(SPLIT_PART(transfer_no, '-', 2) AS INTEGER) DESC"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/pullout-receipts', pullUpload.single('file'), async (req, res) => {
  const { transfer_no, transfer_date, source_location, destination_location, items_count, status, pulled_out_by, prepared_by, returned_by, witnessed_by } = req.body;
  if (!transfer_no || !source_location || !destination_location) {
    return res.status(400).json({ error: 'transfer_no, source_location, and destination_location are required' });
  }
  try {
    const { db } = await dbPromise;
    const file_name = req.file ? req.file.originalname : '';
    const file_path = req.file ? '/uploads/pullout/' + req.file.filename : '';
    const id = await db.insert(
      'INSERT INTO pullout_receipts (transfer_no, transfer_date, source_location, destination_location, items_count, status, pulled_out_by, prepared_by, returned_by, witnessed_by, file_name, file_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [transfer_no.trim(), transfer_date || new Date().toISOString().split('T')[0],
       source_location.trim(), destination_location.trim(),
       +items_count || 0, status || 'Pending',
       (pulled_out_by || '').trim(), (prepared_by || '').trim(),
       (returned_by || '').trim(), (witnessed_by || '').trim(),
       file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM pullout_receipts WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Pullout No '${transfer_no}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/pullout-receipts/:id', pullUpload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM pullout_receipts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Pullout receipt not found' });
    const { transfer_no, transfer_date, source_location, destination_location, items_count, status, pulled_out_by, prepared_by, returned_by, witnessed_by } = req.body;
    let file_name = ex.file_name || '';
    let file_path = ex.file_path || '';
    if (req.file) {
      if (ex.file_name) { try { fs.unlinkSync(path.join(PULL_UPLOAD_DIR, ex.file_name)); } catch {} }
      file_name = req.file.originalname;
      file_path = '/uploads/pullout/' + req.file.filename;
    }
    await db.run(
      `UPDATE pullout_receipts SET transfer_no=?, transfer_date=?, source_location=?, destination_location=?, items_count=?, status=?, pulled_out_by=?, prepared_by=?, returned_by=?, witnessed_by=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(transfer_no ?? ex.transfer_no).trim(), transfer_date ?? ex.transfer_date,
       (source_location ?? ex.source_location).trim(), (destination_location ?? ex.destination_location).trim(),
       items_count != null ? +items_count : ex.items_count, status ?? ex.status,
       (pulled_out_by ?? ex.pulled_out_by ?? '').trim(), (prepared_by ?? ex.prepared_by ?? '').trim(),
       (returned_by ?? ex.returned_by ?? '').trim(), (witnessed_by ?? ex.witnessed_by ?? '').trim(),
       file_name, file_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM pullout_receipts WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/pullout-receipts/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM pullout_receipts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Pullout receipt not found' });
    await db.run('DELETE FROM pullout_receipts WHERE id = ?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TRANSMITTAL RECEIPTS ──────────────────────────────────────────
router.get('/transmittal-receipts', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM transmittal_receipts ORDER BY transfer_no DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/transmittal-receipts', trmitUpload.single('file'), async (req, res) => {
  const { transfer_no, transfer_date, source_location, destination_location, items_description, status, turned_over_by, received_by, witnessed_by, noted_by } = req.body;
  if (!transfer_no || !source_location || !destination_location) {
    return res.status(400).json({ error: 'transfer_no, source_location, and destination_location are required' });
  }
  try {
    const { db } = await dbPromise;
    const file_name = req.file ? req.file.originalname : '';
    const file_path = req.file ? '/uploads/transmittal/' + req.file.filename : '';
    const id = await db.insert(
      'INSERT INTO transmittal_receipts (transfer_no, transfer_date, source_location, destination_location, items_description, status, turned_over_by, received_by, witnessed_by, noted_by, file_name, file_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [transfer_no.trim(), transfer_date || new Date().toISOString().split('T')[0],
       source_location.trim(), destination_location.trim(),
       (items_description || '').trim(), status || 'Pending',
       (turned_over_by || '').trim(), (received_by || '').trim(),
       (witnessed_by || '').trim(), (noted_by || '').trim(),
       file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM transmittal_receipts WHERE id = ?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Transmittal No '${transfer_no}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

router.put('/transmittal-receipts/:id', trmitUpload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT * FROM transmittal_receipts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Transmittal receipt not found' });
    const { transfer_no, transfer_date, source_location, destination_location, items_description, status, turned_over_by, received_by, witnessed_by, noted_by } = req.body;
    let file_name = ex.file_name || '';
    let file_path = ex.file_path || '';
    if (req.file) {
      if (ex.file_name) { try { fs.unlinkSync(path.join(TRMIT_UPLOAD_DIR, ex.file_name)); } catch {} }
      file_name = req.file.originalname;
      file_path = '/uploads/transmittal/' + req.file.filename;
    }
    await db.run(
      `UPDATE transmittal_receipts SET transfer_no=?, transfer_date=?, source_location=?, destination_location=?, items_description=?, status=?, turned_over_by=?, received_by=?, witnessed_by=?, noted_by=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(transfer_no ?? ex.transfer_no).trim(), transfer_date ?? ex.transfer_date,
       (source_location ?? ex.source_location).trim(), (destination_location ?? ex.destination_location).trim(),
       (items_description ?? ex.items_description ?? '').trim(), status ?? ex.status,
       (turned_over_by ?? ex.turned_over_by ?? '').trim(), (received_by ?? ex.received_by ?? '').trim(),
       (witnessed_by ?? ex.witnessed_by ?? '').trim(), (noted_by ?? ex.noted_by ?? '').trim(),
       file_name, file_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM transmittal_receipts WHERE id = ?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/transmittal-receipts/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const ex = await db.getOne('SELECT id FROM transmittal_receipts WHERE id = ?', [+req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Transmittal receipt not found' });
    await db.run('DELETE FROM transmittal_receipts WHERE id = ?', [+req.params.id]);
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
