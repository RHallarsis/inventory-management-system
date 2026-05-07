'use strict';
/**
 * db.js — Hybrid database driver
 * • DATABASE_URL set  → PostgreSQL (pg)
 * • DATABASE_URL unset → SQLite (better-sqlite3, stored in backend/data/)
 *
 * All methods return Promises so existing async/await code works unchanged.
 */

const DATABASE_URL = process.env.DATABASE_URL;

let db;

if (DATABASE_URL) {
  /* ─────────────────────── PostgreSQL mode ─────────────────────── */
  const { Pool, types } = require('pg');
  types.setTypeParser(1082, v => v); // DATE
  types.setTypeParser(1114, v => v); // TIMESTAMP
  types.setTypeParser(1184, v => v); // TIMESTAMPTZ

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  pool.on('error', err => console.error('[pg] pool error:', err.message));

  function pgify(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  db = {
    async getAll(sql, params = []) {
      const { rows } = await pool.query(pgify(sql), params);
      return rows;
    },
    async getOne(sql, params = []) {
      const { rows } = await pool.query(pgify(sql), params);
      return rows[0] || null;
    },
    async insert(sql, params = []) {
      const { rows } = await pool.query(pgify(sql) + ' RETURNING id', params);
      return rows[0] ? rows[0].id : null;
    },
    async run(sql, params = []) {
      await pool.query(pgify(sql), params);
    },
    async scalar(sql, params = []) {
      const { rows } = await pool.query(pgify(sql), params);
      if (!rows[0]) return 0;
      return parseInt(Object.values(rows[0])[0], 10) || 0;
    },
    save() {},
  };

  console.log('[db] Mode: PostgreSQL');

} else {
  /* ─────────────────────── SQLite mode ─────────────────────── */
  const BetterSQLite = require('better-sqlite3');
  const path = require('path');
  const fs   = require('fs');

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new BetterSQLite(path.join(dataDir, 'inventory.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  /** Convert PG-flavoured SQL to SQLite-compatible SQL */
  function sqfy(sql) {
    return sql
      .replace(/\bSERIAL\b/gi,      'INTEGER')
      .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
      .replace(/DEFAULT NOW\(\)/gi,  "DEFAULT (datetime('now'))")
      .replace(/\bNOW\(\)/gi,        "datetime('now')")
      .replace(/ADD COLUMN IF NOT EXISTS\b/gi, 'ADD COLUMN')
      .replace(/ALTER TABLE \S+ DROP COLUMN IF EXISTS \S+/gi, 'SELECT 1')
      .replace(/ALTER TABLE \S+ DROP COLUMN \S+/gi,          'SELECT 1')
      .replace(/\s+RETURNING\s+id\s*$/i, '')
      .replace(/\bCHECK\s*\([^)]+\)/gi, '');
  }

  db = {
    async getAll(sql, params = []) {
      try { return sqlite.prepare(sqfy(sql)).all(params); }
      catch (e) { console.error('[sqlite] getAll:', e.message); return []; }
    },
    async getOne(sql, params = []) {
      try { return sqlite.prepare(sqfy(sql)).get(params) || null; }
      catch (e) { console.error('[sqlite] getOne:', e.message); return null; }
    },
    async insert(sql, params = []) {
      try {
        const r = sqlite.prepare(sqfy(sql)).run(params);
        return r.lastInsertRowid;
      } catch (e) { console.error('[sqlite] insert:', e.message); return null; }
    },
    async run(sql, params = []) {
      try { sqlite.prepare(sqfy(sql)).run(params); }
      catch (e) {
        const msg = e.message || '';
        if (!msg.includes('duplicate column') && !msg.includes('no such column'))
          console.error('[sqlite] run:', msg.slice(0, 120));
      }
    },
    async scalar(sql, params = []) {
      try {
        const row = sqlite.prepare(sqfy(sql)).get(params);
        if (!row) return 0;
        return parseInt(Object.values(row)[0], 10) || 0;
      } catch (e) { return 0; }
    },
    save() {},
  };

  console.log('[db] Mode: SQLite (no DATABASE_URL)');
}

module.exports = { pool: null, db };
