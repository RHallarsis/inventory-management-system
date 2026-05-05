/**
 * jobQueue.js — Parallel Worker-Thread Job Queue
 *
 * Spawns up to `concurrency` Node.js worker threads at once.
 * Every job gets a unique ID so callers can poll for its result
 * without ever blocking the Express event loop.
 *
 * Usage:
 *   const queue = require('./jobQueue');
 *   const job   = queue.enqueue('low-stock-check', { threshold: 10 });
 *   // later …
 *   const state = queue.getJob(job.id);  // { status, result, error, … }
 */

'use strict';

const { Worker }       = require('worker_threads');
const { EventEmitter } = require('events');
const crypto           = require('crypto');
const path             = require('path');

const WORKER_SCRIPT = path.join(__dirname, 'workerScript.js');

class JobQueue extends EventEmitter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.concurrency=4]  Max parallel worker threads.
   */
  constructor({ concurrency = 4 } = {}) {
    super();
    this.concurrency = concurrency;
    this._running    = 0;          // threads currently alive
    this._pending    = [];         // FIFO queue of waiting job objects
    this._jobs       = new Map();  // jobId → job state
  }

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Add a job to the queue.
   * Returns the job object immediately (status = 'pending').
   * @param {string} type
   * @param {object} [payload={}]
   * @returns {{ id, type, status, payload, createdAt, startedAt, finishedAt, result, error }}
   */
  enqueue(type, payload = {}) {
    const job = {
      id:         crypto.randomUUID(),
      type,
      payload,
      status:     'pending',
      createdAt:  new Date().toISOString(),
      startedAt:  null,
      finishedAt: null,
      result:     null,
      error:      null,
    };
    this._jobs.set(job.id, job);
    this._pending.push(job);
    this._dispatch();
    return job;
  }

  /** @returns {object|null} */
  getJob(id) {
    return this._jobs.get(id) ?? null;
  }

  /** @returns {object[]} All jobs, newest-first. */
  listJobs() {
    return [...this._jobs.values()].reverse();
  }

  /** @returns {{ pending, running, total }} */
  stats() {
    return {
      pending: this._pending.length,
      running: this._running,
      total:   this._jobs.size,
    };
  }

  // ── Internal ───────────────────────────────────────────────────

  _dispatch() {
    while (this._running < this.concurrency && this._pending.length > 0) {
      this._run(this._pending.shift());
    }
  }

  _run(job) {
    this._running++;
    job.status    = 'running';
    job.startedAt = new Date().toISOString();

    const worker = new Worker(WORKER_SCRIPT, {
      workerData: { type: job.type, payload: job.payload },
    });

    worker.once('message', (result) => {
      job.status     = 'done';
      job.result     = result;
      job.finishedAt = new Date().toISOString();
      this._running--;
      this.emit('done', job);
      this._dispatch();
    });

    worker.once('error', (err) => {
      job.status     = 'failed';
      job.error      = err.message;
      job.finishedAt = new Date().toISOString();
      this._running--;
      this.emit('failed', job);
      console.error(`[jobQueue] Job ${job.id} (${job.type}) failed:`, err.message);
      this._dispatch();
    });

    worker.once('exit', (code) => {
      // Non-zero exit that didn't fire 'error' (rare edge-case)
      if (job.status === 'running') {
        job.status     = 'failed';
        job.error      = `Worker exited with code ${code}`;
        job.finishedAt = new Date().toISOString();
        this._running--;
        this.emit('failed', job);
        this._dispatch();
      }
    });
  }
}

// Export a singleton queue shared across the whole process.
module.exports = new JobQueue({ concurrency: 4 });
