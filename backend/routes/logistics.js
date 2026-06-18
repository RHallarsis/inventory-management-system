const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { dbPromise } = require('../database');

const router = express.Router();

// ── Upload directory ──────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/logistics');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ════════════════════════════════════════════════════════════════
// TRUCKING QUOTATIONS
// ════════════════════════════════════════════════════════════════
router.get('/logistics/trucking', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM trucking_quotations ORDER BY date_of_activity DESC, id DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logistics/trucking', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { quote_number, trucking_service, date_of_activity, sites, total_amount, status } = req.body;
    if (!quote_number || !trucking_service) return res.status(400).json({ error: 'Quote number and trucking service are required' });
    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : '';
    const id = await db.insert(
      `INSERT INTO trucking_quotations (quote_number, trucking_service, date_of_activity, sites, total_amount, status, file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?)`,
      [quote_number.trim(), trucking_service.trim(), date_of_activity || new Date().toISOString().slice(0, 10),
       sites || '', parseFloat(total_amount) || 0, status || 'Pending', file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM trucking_quotations WHERE id=?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Quote number already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/logistics/trucking/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM trucking_quotations WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { quote_number, trucking_service, date_of_activity, sites, total_amount, status } = req.body;
    const file_name = req.file ? req.file.filename : existing.file_name;
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : existing.file_path;
    // Delete old file if replaced
    if (req.file && existing.file_name) {
      const old = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.run(
      `UPDATE trucking_quotations SET quote_number=?, trucking_service=?, date_of_activity=?, sites=?,
       total_amount=?, status=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(quote_number || existing.quote_number).trim(), (trucking_service || existing.trucking_service).trim(),
       date_of_activity || existing.date_of_activity, sites || existing.sites,
       parseFloat(total_amount) || existing.total_amount, status || existing.status,
       file_name, file_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM trucking_quotations WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/logistics/trucking/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM trucking_quotations WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.file_name) {
      const filePath = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.run('DELETE FROM trucking_quotations WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// MANPOWER REQUESTS
// ════════════════════════════════════════════════════════════════
router.get('/logistics/manpower', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM manpower_requests ORDER BY created_at DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/logistics/manpower/next-request-no', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.scalar(
      "SELECT COUNT(*) FROM manpower_requests WHERE request_no LIKE 'MP-" + today + "-%'"
    );
    const next = 'MP-' + today + '-' + String(count + 1).padStart(5, '0');
    res.json({ request_no: next });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logistics/manpower', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { request_no, location, machine_type, machine_quantity, manpower_quantity, purpose, unit_price, remarks } = req.body;
    if (!location || !machine_type) return res.status(400).json({ error: 'Location and machine type are required' });
    const mq  = parseInt(machine_quantity)  || 0;
    const mpq = parseInt(manpower_quantity) || 0;
    const up  = parseFloat(unit_price)      || 0;
    const total = mpq * up;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = (await db.scalar(
      "SELECT COUNT(*) FROM manpower_requests WHERE request_no LIKE 'MP-" + today + "-%'"
    )) + 1;
    const rno = 'MP-' + today + '-' + String(seq).padStart(5, '0');
    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : '';
    const id = await db.insert(
      `INSERT INTO manpower_requests (request_no, location, machine_type, machine_quantity, manpower_quantity, purpose, unit_price, remarks, total, file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [rno, location.trim(), machine_type.trim(), mq, mpq, purpose || '', up, remarks || '', total, file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM manpower_requests WHERE id=?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Request number already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/logistics/manpower/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM manpower_requests WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { location, machine_type, machine_quantity, manpower_quantity, purpose, unit_price, remarks, payment_status } = req.body;
    const mq  = machine_quantity  != null ? parseInt(machine_quantity)  : existing.machine_quantity;
    const mpq = manpower_quantity != null ? parseInt(manpower_quantity) : existing.manpower_quantity;
    const up  = unit_price        != null ? parseFloat(unit_price)      : existing.unit_price;
    const total = mpq * up;
    const file_name = req.file ? req.file.filename : existing.file_name;
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : existing.file_path;
    if (req.file && existing.file_name) {
      const old = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    const ps = payment_status || existing.payment_status || 'Pending';
    await db.run(
      `UPDATE manpower_requests SET location=?, machine_type=?, machine_quantity=?, manpower_quantity=?,
       purpose=?, unit_price=?, remarks=?, total=?, file_name=?, file_path=?, payment_status=?, updated_at=NOW() WHERE id=?`,
      [(location || existing.location).trim(), (machine_type || existing.machine_type).trim(),
       mq, mpq, purpose || existing.purpose, up, remarks || existing.remarks, total, file_name, file_path, ps, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM manpower_requests WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/logistics/manpower/:id/payment', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { payment_status } = req.body;
    const valid = ['Pending', 'For Release', 'Released', 'Cancelled'];
    if (!valid.includes(payment_status)) return res.status(400).json({ error: 'Invalid payment status' });
    await db.run(
      `UPDATE manpower_requests SET payment_status=?, updated_at=NOW() WHERE id=?`,
      [payment_status, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM manpower_requests WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/logistics/manpower/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM manpower_requests WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.file_name) {
      const filePath = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.run('DELETE FROM manpower_requests WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SITES ACTIVITY
// ════════════════════════════════════════════════════════════════
router.get('/logistics/sites-activity', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM sites_activity ORDER BY activity_date DESC, id DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logistics/sites-activity', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { site_name, activity_type, activity_date, location, description, status } = req.body;
    if (!site_name) return res.status(400).json({ error: 'Site name is required' });
    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : '';
    const id = await db.insert(
      `INSERT INTO sites_activity (site_name, activity_type, activity_date, location, description, status, file_name, file_path)
       VALUES (?,?,?,?,?,?,?,?)`,
      [site_name.trim(), activity_type || 'Delivery', activity_date || new Date().toISOString().slice(0, 10),
       location || '', description || '', status || 'Scheduled', file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM sites_activity WHERE id=?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/logistics/sites-activity/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM sites_activity WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { site_name, activity_type, activity_date, location, description, status } = req.body;
    const file_name = req.file ? req.file.filename : existing.file_name;
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : existing.file_path;
    if (req.file && existing.file_name) {
      const old = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.run(
      `UPDATE sites_activity SET site_name=?, activity_type=?, activity_date=?, location=?,
       description=?, status=?, file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(site_name || existing.site_name).trim(), activity_type || existing.activity_type,
       activity_date || existing.activity_date, location || existing.location,
       description || existing.description, status || existing.status,
       file_name, file_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM sites_activity WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/logistics/sites-activity/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM sites_activity WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.file_name) {
      const filePath = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.run('DELETE FROM sites_activity WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// WAYBILLS
// ════════════════════════════════════════════════════════════════
router.get('/logistics/waybills', async (_req, res) => {
  try {
    const { db } = await dbPromise;
    res.json(await db.getAll('SELECT * FROM waybills ORDER BY date DESC, id DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logistics/waybills', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { waybill_number, date, origin, destination, notes } = req.body;
    if (!waybill_number) return res.status(400).json({ error: 'Waybill number is required' });
    const file_name = req.file ? req.file.filename : '';
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : '';
    const id = await db.insert(
      `INSERT INTO waybills (waybill_number, date, origin, destination, notes, file_name, file_path)
       VALUES (?,?,?,?,?,?,?)`,
      [waybill_number.trim(), date || new Date().toISOString().slice(0, 10),
       origin || '', destination || '', notes || '', file_name, file_path]
    );
    res.status(201).json(await db.getOne('SELECT * FROM waybills WHERE id=?', [id]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Waybill number already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/logistics/waybills/:id', upload.single('file'), async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM waybills WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { waybill_number, date, origin, destination, notes } = req.body;
    const file_name = req.file ? req.file.filename : existing.file_name;
    const file_path = req.file ? '/uploads/logistics/' + req.file.filename : existing.file_path;
    if (req.file && existing.file_name) {
      const old = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.run(
      `UPDATE waybills SET waybill_number=?, date=?, origin=?, destination=?, notes=?,
       file_name=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [(waybill_number || existing.waybill_number).trim(), date || existing.date,
       origin || existing.origin, destination || existing.destination, notes || existing.notes,
       file_name, file_path, +req.params.id]
    );
    res.json(await db.getOne('SELECT * FROM waybills WHERE id=?', [+req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/logistics/waybills/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const existing = await db.getOne('SELECT * FROM waybills WHERE id=?', [+req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.file_name) {
      const fp = path.join(UPLOAD_DIR, existing.file_name);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.run('DELETE FROM waybills WHERE id=?', [+req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
