const express = require('express');
const crypto  = require('crypto');
const { dbPromise } = require('../database');
const router = express.Router();

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const { db } = await dbPromise;

    const user = await db.getOne(
      `SELECT id, name, email, role, status, session_token, session_at FROM users
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

    // Single-session check: block if an active session exists within the timeout window
    if (user.session_token && user.session_at) {
      const idleMs = Date.now() - new Date(user.session_at).getTime();
      if (idleMs < SESSION_TIMEOUT_MS) {
        return res.status(409).json({
          error: 'This account is already logged in on another device. Please sign out from that device first, or wait for the session to expire automatically.',
          code: 'SESSION_ACTIVE'
        });
      }
    }

    // Issue a new session token
    const token = crypto.randomBytes(32).toString('hex');
    await db.run(
      `UPDATE users SET session_token=$1, session_at=NOW() WHERE id=$2`,
      [token, user.id]
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      session_token: token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — clears the session token
router.post('/auth/logout', async (req, res) => {
  try {
    const { user_id, session_token } = req.body;
    if (!user_id || !session_token) return res.json({ ok: true });
    const { db } = await dbPromise;
    await db.run(
      `UPDATE users SET session_token=NULL, session_at=NULL WHERE id=$1 AND session_token=$2`,
      [user_id, session_token]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/heartbeat — keeps session alive; returns 401 if taken over
router.post('/auth/heartbeat', async (req, res) => {
  try {
    const { user_id, session_token } = req.body;
    if (!user_id || !session_token) return res.status(400).json({ error: 'Missing params' });
    const { db } = await dbPromise;
    const user = await db.getOne(`SELECT session_token FROM users WHERE id=$1`, [user_id]);
    if (!user || user.session_token !== session_token) {
      return res.status(401).json({ error: 'SESSION_INVALIDATED' });
    }
    await db.run(`UPDATE users SET session_at=NOW() WHERE id=$1`, [user_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users — list all users (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const users = await db.getAll(
      'SELECT id, name, email, role, status, created_at FROM users ORDER BY id ASC'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create new user
router.post('/users', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const { name, email, role, password, status } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await db.getOne('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
    if (existing) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const id = await db.insert(
      'INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,?)',
      [name.trim(), email.trim(), role || 'Staff', password, status || 'Active']
    );
    const u = await db.getOne('SELECT id, name, email, role, status FROM users WHERE id=?', [id]);
    res.json(u);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with that email already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update user
router.put('/users/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const id = parseInt(req.params.id);
    const { name, email, role, password, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const dup = await db.getOne(
      'SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id!=?', [email, id]
    );
    if (dup) {
      return res.status(409).json({ error: 'Another user with that email already exists.' });
    }

    if (password && password.trim()) {
      await db.run(
        `UPDATE users SET name=?,email=?,role=?,password=?,status=?,updated_at=NOW() WHERE id=?`,
        [name.trim(), email.trim(), role || 'Staff', password.trim(), status || 'Active', id]
      );
    } else {
      await db.run(
        `UPDATE users SET name=?,email=?,role=?,status=?,updated_at=NOW() WHERE id=?`,
        [name.trim(), email.trim(), role || 'Staff', status || 'Active', id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { db } = await dbPromise;
    const id = parseInt(req.params.id);

    const target = await db.getOne('SELECT role FROM users WHERE id=?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const adminCount = await db.scalar(
      "SELECT COUNT(*) FROM users WHERE role='Admin' AND status='Active'"
    );
    if (target.role === 'Admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only Admin account.' });
    }

    await db.run('DELETE FROM users WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/auth/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }
    const { db } = await dbPromise;
    const user = await db.getOne('SELECT id, password FROM users WHERE LOWER(email)=LOWER(?)', [email.trim()]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }
    // If currentPassword is supplied (Settings page flow), verify it first
    if (currentPassword !== undefined && currentPassword !== null && currentPassword !== '') {
      if (user.password !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }
    await db.run(`UPDATE users SET password=?,updated_at=NOW() WHERE id=?`, [newPassword.trim(), user.id]);
    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
