/**
 * db.js — PostgreSQL pool + sql.js-compatible helper interface
 *
 * Wraps `pg` so all routes can use familiar getAll/getOne/run/insert
 * methods. Parameter placeholders: still write ? in SQL — pgify()
 * converts them to $1, $2, … before sending to Postgres.
 */
'use strict';

const { Pool, types } = require('pg');

// Return timestamps/dates as plain strings so the frontend receives
// the same format it did with SQLite (no JS Date objects from the driver).
types.setTypeParser(1082, val => val); // DATE
types.setTypeParser(1114, val => val); // TIMESTAMP
types.setTypeParser(1184, val => val); // TIMESTAMPTZ

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => console.error('[pg] Unexpected pool error:', err.message));

// Convert ? placeholders to $1 $2 $3 …
function pgify(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  // Returns an array of row objects
  async getAll(sql, params = []) {
    const { rows } = await pool.query(pgify(sql), params);
    return rows;
  },

  // Returns a single row object or null
  async getOne(sql, params = []) {
    const { rows } = await pool.query(pgify(sql), params);
    return rows[0] || null;
  },

  // Runs INSERT … RETURNING id and returns the new numeric id
  async insert(sql, params = []) {
    const { rows } = await pool.query(pgify(sql) + ' RETURNING id', params);
    return rows[0] ? rows[0].id : null;
  },

  // Runs UPDATE / DELETE (or any non-returning statement)
  async run(sql, params = []) {
    await pool.query(pgify(sql), params);
  },

  // Returns the integer value of the first column of the first row
  // Useful for COUNT(*) queries
  async scalar(sql, params = []) {
    const { rows } = await pool.query(pgify(sql), params);
    if (!rows[0]) return 0;
    const val = Object.values(rows[0])[0];
    return parseInt(val, 10) || 0;
  },

  // No-op — pg persists automatically
  save() {},
};

module.exports = { pool, db };
