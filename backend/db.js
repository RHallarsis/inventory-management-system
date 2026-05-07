'use strict';
/**
 * db.js — Hybrid database driver
 * • DATABASE_URL set  → PostgreSQL (pg)
 * • DATABASE_URL unset → SQLite via sql.js (pure JS, no native compilation)
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
  /* ─────────────────────── SQLite mode (sql.js — pure JS) ─────────────────────── */
  const path = require('path');
  const fs   = require('fs');

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'inventory.db');

  // sql.js is loaded asynchronously — we keep a reference and a ready promise
  let sqlite = null;
  let _saveTimer = null;

  function persistDb() {
    if (!sqlite) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      try {
        const data = sqlite.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
      } catch (e) {
        console.error('[sqljs] persist error:', e.message);
      }
    }, 200);
  }

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

  // Initialise sql.js synchronously via the ready promise
  const initSqlJs = require('sql.js');
  const readyPromise = initSqlJs().then(SQL => {
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    sqlite = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
    sqlite.run("PRAGMA journal_mode = WAL;");
    sqlite.run("PRAGMA foreign_keys = ON;");
    console.log('[db] Mode: SQLite/sql.js' + (fileBuffer ? ' (loaded existing db)' : ' (new db)'));
  }).catch(e => {
    console.error('[sqljs] init failed:', e.message);
  });

  function ensureReady() {
    return readyPromise;
  }

  function runStmt(sql, params = []) {
    const stmt = sqlite.prepare(sqfy(sql));
    stmt.run(params);
    stmt.free();
  }

  function allRows(sql, params = []) {
    const stmt = sqlite.prepare(sqfy(sql));
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  function oneRow(sql, params = []) {
    const stmt = sqlite.prepare(sqfy(sql));
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  db = {
    async getAll(sql, params = []) {
      await ensureReady();
      try { return allRows(sql, params); }
      catch (e) { console.error('[sqljs] getAll:', e.message); return []; }
    },
    async getOne(sql, params = []) {
      await ensureReady();
      try { return oneRow(sql, params); }
      catch (e) { console.error('[sqljs] getOne:', e.message); return null; }
    },
    async insert(sql, params = []) {
      await ensureReady();
      try {
        runStmt(sql, params);
        persistDb();
        const row = oneRow('SELECT last_insert_rowid() as id', []);
        return row ? row.id : null;
      } catch (e) { console.error('[sqljs] insert:', e.message); return null; }
    },
    async run(sql, params = []) {
      await ensureReady();
      try {
        runStmt(sql, params);
        persistDb();
      } catch (e) {
        const msg = e.message || '';
        if (!msg.includes('duplicate column') && !msg.includes('no such column'))
          console.error('[sqljs] run:', msg.slice(0, 120));
      }
    },
    async scalar(sql, params = []) {
      await ensureReady();
      try {
        const row = oneRow(sql, params);
        if (!row) return 0;
        return parseInt(Object.values(row)[0], 10) || 0;
      } catch (e) { return 0; }
    },
    save() { persistDb(); },
  };
}

module.exports = { pool: null, db };
