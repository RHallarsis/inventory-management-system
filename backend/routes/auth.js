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

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const { db } = await dbPromise;

    // Match by name OR email (case-insensitive), and password
    const user = getOne(db,
      `SELECT id, name, email, role, status FROM users
       WHERE (LOWER(name) = LOWER(?) OR LOWER(email) = LOWER(?))
         AND password = ?`,
      [identifier, identifier, password]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is inactive. Contact your administrator.' });
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users — list all users (Admin only) ─────────────
router.get('/users', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const result = db.exec('SELECT id, name, email, role, status, created_at FROM users ORDER BY id ASC');
    const users = result.length ? result[0].values.map(([id, name, email, role, status, created_at]) =>
      ({ id, name, email, role, status, created_at })) : [];
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users — create new user ────────────────────────
router.post('/users', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const { name, email, role, password, status } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    // Check duplicate email
    const existing = db.exec('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
    if (existing.length && existing[0].values.length) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    db.run(
      `INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,?)`,
      [name.trim(), email.trim(), role || 'Staff', password, status || 'Active']
    );
    save();
    const newUser = db.exec('SELECT id, name, email, role, status FROM users WHERE email=? COLLATE NOCASE', [email]);
    const u = newUser[0].values[0];
    res.json({ id: u[0], name: u[1], email: u[2], role: u[3], status: u[4] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/:id — update user ─────────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const id = parseInt(req.params.id);
    const { name, email, role, password, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    // Check duplicate email on another user
    const dup = db.exec('SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id!=?', [email, id]);
    if (dup.length && dup[0].values.length) {
      return res.status(409).json({ error: 'Another user with that email already exists.' });
    }
    if (password && password.trim()) {
      db.run(
        `UPDATE users SET name=?,email=?,role=?,password=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [name.trim(), email.trim(), role || 'Staff', password.trim(), status || 'Active', id]
      );
    } else {
      db.run(
        `UPDATE users SET name=?,email=?,role=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [name.trim(), email.trim(), role || 'Staff', status || 'Active', id]
      );
    }
    save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/:id — delete user ──────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const { db, save } = await dbPromise;
    const id = parseInt(req.params.id);
    // Prevent deleting the last admin
    const admins = db.exec("SELECT COUNT(*) FROM users WHERE role='Admin' AND status='Active'");
    const adminCount = admins[0].values[0][0];
    const target = db.exec('SELECT role FROM users WHERE id=?', [id]);
    if (!target.length || !target[0].values.length) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (target[0].values[0][0] === 'Admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only Admin account.' });
    }
    db.run('DELETE FROM users WHERE id=?', [id]);
    save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
