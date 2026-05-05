/**
 * routes/jobs.js — Job Queue REST API
 *
 * POST   /api/jobs          Enqueue a new background job (returns 202 + jobId)
 * GET    /api/jobs          List all jobs (newest first)
 * GET    /api/jobs/:id      Poll a single job for status / result
 * GET    /api/jobs/stats    Queue stats (pending, running, total)
 */

'use strict';

const express      = require('express');
const { dbPromise } = require('../database');
const queue        = require('../workers/jobQueue');

const router = express.Router();

// ── Valid job types ────────────────────────────────────────────
const VALID_TYPES = ['low-stock-check', 'reorder-calc', 'bulk-status-recalc', 'report-summary'];

// ── POST /api/jobs ─────────────────────────────────────────────
//  Body: { type: string, payload?: object }
//  When payload is omitted (or missing required keys), the route
//  auto-fetches the data it needs straight from the DB.
router.post('/jobs', async (req, res) => {
  const { type, payload } = req.body ?? {};

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `"type" must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  try {
    const { db } = await dbPromise;
    let jobPayload = { ...(payload ?? {}) };

    // ── Auto-populate from DB so callers can fire-and-forget ──
    if (type === 'low-stock-check' && !jobPayload.products) {
      jobPayload.products = await db.getAll('SELECT * FROM products');
    }

    if (type === 'reorder-calc' && !jobPayload.spareParts) {
      jobPayload.spareParts = await db.getAll('SELECT * FROM spare_parts');
    }

    if (type === 'bulk-status-recalc' && !jobPayload.products) {
      jobPayload.products = await db.getAll('SELECT * FROM products');
    }

    if (type === 'report-summary') {
      if (!jobPayload.products)   jobPayload.products   = await db.getAll('SELECT * FROM products');
      if (!jobPayload.spareParts) jobPayload.spareParts = await db.getAll('SELECT * FROM spare_parts');
    }

    const job = queue.enqueue(type, jobPayload);

    return res.status(202).json({
      jobId:     job.id,
      type:      job.type,
      status:    job.status,
      createdAt: job.createdAt,
      _links: {
        self:   `/api/jobs/${job.id}`,
        list:   '/api/jobs',
        stats:  '/api/jobs/stats',
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/jobs/stats ────────────────────────────────────────
//  Must be registered BEFORE /api/jobs/:id so 'stats' isn't
//  treated as an :id param.
router.get('/jobs/stats', (_req, res) => {
  res.json(queue.stats());
});

// ── GET /api/jobs ──────────────────────────────────────────────
router.get('/jobs', (_req, res) => {
  const jobs = queue.listJobs().map(safeView);
  res.json(jobs);
});

// ── GET /api/jobs/:id ──────────────────────────────────────────
router.get('/jobs/:id', (req, res) => {
  const job = queue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(safeView(job));
});

// ── Helper: strip internal payload from responses ──────────────
function safeView({ id, type, status, createdAt, startedAt, finishedAt, result, error }) {
  return { id, type, status, createdAt, startedAt, finishedAt, result, error };
}

module.exports = router;
