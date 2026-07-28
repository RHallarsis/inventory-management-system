'use strict';
/**
 * middleware/auth.js — Role-based access-control layer
 *
 * BACKGROUND
 * ----------
 * Before this file existed, every /api/* route was completely open: the
 * frontend's role-based UI (hiding buttons/pages for Staff/Viewer) was the
 * ONLY protection, and it could be bypassed trivially by calling the API
 * directly (curl, devtools, Postman) — confirmed live against production
 * on pgi-ims.up.railway.app, where GET /api/users returned the full user
 * list with zero authentication required.
 *
 * This file adds real, server-side enforcement. The frontend now attaches
 * the logged-in user's id + session token to every API call via the
 * `X-User-Id` / `X-Session-Token` headers (see the fetch wrapper added
 * near the top of frontend/index.html's <script> block). These helpers
 * validate that token against the users table and gate access by role.
 *
 * ROLES
 * -----
 *   Admin, Manager  — full access to everything (Manager == Admin, per
 *                      product decision; there is no reduced-Manager tier).
 *   Staff           — read-only everywhere, EXCEPT full CRUD + file
 *                      management on "document modules" (any resource that
 *                      has file upload/attachment: Purchase Orders, Sales
 *                      Invoices, Suppliers, CI/PL, Stock Transfers, Pullout
 *                      Receipts, Transmittal Receipts, Logistics,
 *                      Supplier Quotations). Never has access to
 *                      Settings/Users/Logs.
 *   Viewer          — read-only everywhere, no exceptions. Additionally
 *                      blocked from ever downloading/opening any uploaded
 *                      file (enforced separately on the /uploads static
 *                      route in server.js), and blocked from
 *                      Settings/Users/Logs like Staff.
 */

const FULL_ACCESS_ROLES = ['Admin', 'Manager'];

/**
 * Identify the caller (if any) from the request headers and attach it as
 * req.currentUser. Never blocks the request itself — it only figures out
 * who (if anyone) is calling; requireAuth/requireRole/requireWrite below
 * decide what to do with that information.
 *
 * `../database` is required lazily (not at module top) so that requiring
 * this file can never crash the process at startup the way a top-level
 * require would — server.js deliberately loads database.js inside its own
 * try/catch so /health and /api/diag stay up even if the DB fails to
 * initialise, and this preserves that guarantee.
 */
async function attachUser(req, res, next) {
  try {
    // Normal API calls go through the frontend's fetch() wrapper, which
    // attaches these as headers. But plain <a href="/uploads/...">
    // file-download links are followed by the browser as a direct
    // navigation (or an <a target="_blank"> click) — the browser never
    // attaches custom headers to that kind of request, only to fetch()/XHR.
    // So file links instead pass the same identity as ?uid=&token= query
    // params, and we accept either form here.
    const userId = parseInt(req.headers['x-user-id'] || req.query.uid, 10);
    const token = req.headers['x-session-token'] || req.query.token;
    if (!userId || !token) {
      req.currentUser = null;
      return next();
    }

    const { dbPromise } = require('../database');
    const { db } = await dbPromise;
    const user = await db.getOne(
      'SELECT id, name, email, role, status, session_token FROM users WHERE id=?',
      [userId]
    );

    if (!user || user.status !== 'Active' || !user.session_token || user.session_token !== token) {
      req.currentUser = null;
    } else {
      req.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    }
  } catch (e) {
    console.error('[auth] attachUser error:', e.message);
    req.currentUser = null;
  }
  next();
}

/** Must be logged in (any valid role) to proceed. */
function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Login required.' });
  }
  next();
}

/** Only the listed roles may proceed. Use for Admin/Manager-only areas
 *  (user management, Settings, Logs). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Login required.' });
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/**
 * Gate a write action (POST/PUT/PATCH/DELETE).
 *   isDocumentModule=true   → Admin, Manager, and Staff may write
 *                             ("Documents" section — full file/record access).
 *   isDocumentModule=false  → only Admin/Manager may write; Staff and
 *                             Viewer are read-only on this resource.
 * Viewer never passes this check, regardless of isDocumentModule.
 */
function requireWrite(isDocumentModule = false) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Login required.' });
    }
    const role = req.currentUser.role;
    if (FULL_ACCESS_ROLES.includes(role)) return next();
    if (isDocumentModule && role === 'Staff') return next();
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  };
}

module.exports = { attachUser, requireAuth, requireRole, requireWrite, FULL_ACCESS_ROLES };
