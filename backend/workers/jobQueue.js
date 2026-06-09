/**
 * jobQueue.js — Persistent Parallel Worker-Thread Pool
 *
 * A reusable "team" of Node.js worker threads that runs CPU-heavy
 * inventory jobs off the main Express event loop. Threads are spawned
 * ONCE (lazily, on first job) and reused for every subsequent job, so
 * there is no per-job thread-spawn cost. Callers get a job id back
 * immediately and poll for the result — the HTTP request never blocks.
 *
 * Hardening over a naive queue:
 *   - Reusable pool (the "team") instead of spawn-per-job.
 *   - Per-job timeout — a stuck worker is killed and auto-replaced so
 *     the team size stays constant and the queue keeps draining.
 *   - Bounded job history — oldest finished jobs are pruned so memory
 *     can't grow without limit on a long-running server.
 *   - Graceful shutdown() to terminate the team cleanly.
 *
 * Public API (unchanged — routes/jobs.js & server.js need no edits):
 *   enqueue(type, payload) -> job          (status 'pending', returns now)
 *   getJob(id)             -> job | null
 *   listJobs()             -> job[]        (newest first)
 *   stats()                -> { pending, running, total, workers, concurrency }
 *   shutdown()             -> Promise      (terminate all workers)
 *
 * Tunable via env: JOB_CONCURRENCY, JOB_TIMEOUT_MS, JOB_MAX_HISTORY.
 */

'use strict';

const { Worker }       = require('worker_threads');
const { EventEmitter } = require('events');
const crypto           = require('crypto');
const path             = require('path');

const WORKER_SCRIPT = path.join(__dirname, 'workerScript.js');

const DEFAULTS = {
  concurrency: Number(process.env.JOB_CONCURRENCY) || 4,
  timeoutMs:   Number(process.env.JOB_TIMEOUT_MS)  || 30000,
  maxHistory:  Number(process.env.JOB_MAX_HISTORY) || 500,
};

class JobQueue extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.concurrency = opts.concurrency ?? DEFAULTS.concurrency;
    this.timeoutMs   = opts.timeoutMs   ?? DEFAULTS.timeoutMs;
    this.maxHistory  = opts.maxHistory  ?? DEFAULTS.maxHistory;
    this._script     = opts.workerScript || WORKER_SCRIPT;   // override for tests

    this._pending = [];          // FIFO of waiting job objects
    this._jobs    = new Map();   // jobId -> job state (insertion-ordered)
    this._workers = [];          // pool of worker wrappers
    this._started = false;
    this._shuttingDown = false;
  }

  // -- Public API --------------------------------------------------

  enqueue(type, payload = {}) {
    if (this._shuttingDown) throw new Error('JobQueue is shutting down');
    this._ensureStarted();

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

  getJob(id) {
    return this._jobs.get(id) ?? null;
  }

  listJobs() {
    return [...this._jobs.values()].reverse();
  }

  stats() {
    return {
      pending:     this._pending.length,
      running:     this._workers.filter(w => w.busy).length,
      total:       this._jobs.size,
      workers:     this._workers.length,
      concurrency: this.concurrency,
    };
  }

  async shutdown() {
    this._shuttingDown = true;
    const workers = this._workers.splice(0);
    await Promise.all(workers.map(w => this._terminate(w)));
  }

  // -- Internal ----------------------------------------------------

  _ensureStarted() {
    if (this._started) return;
    this._started = true;
    for (let i = 0; i < this.concurrency; i++) this._spawnWorker();
  }

  _spawnWorker() {
    const wrap = { worker: null, busy: false, jobId: null, timer: null, ready: false, dead: false };
    const worker = new Worker(this._script);
    wrap.worker = worker;

    worker.on('message', (msg) => {
      if (wrap.dead) return;
      if (msg && msg.__ready) { wrap.ready = true; this._dispatch(); return; }
      this._handleResult(wrap, msg);
    });
    worker.on('error', (err) => {
      if (wrap.dead) return;
      this._handleWorkerFailure(wrap, err && err.message ? err.message : String(err));
    });
    worker.on('exit', (code) => {
      if (wrap.dead || this._shuttingDown) return;
      this._handleWorkerFailure(wrap, `Worker exited unexpectedly (code ${code})`);
    });

    this._workers.push(wrap);
    return wrap;
  }

  _idleWorker() {
    return this._workers.find(w => w.ready && !w.busy && !w.dead);
  }

  _dispatch() {
    while (this._pending.length > 0) {
      const wrap = this._idleWorker();
      if (!wrap) break;                 // no free worker -> stays queued (non-blocking)
      this._assign(wrap, this._pending.shift());
    }
  }

  _assign(wrap, job) {
    wrap.busy  = true;
    wrap.jobId = job.id;
    job.status    = 'running';
    job.startedAt = new Date().toISOString();

    if (this.timeoutMs > 0) {
      wrap.timer = setTimeout(() => this._onTimeout(wrap, job), this.timeoutMs);
      if (wrap.timer.unref) wrap.timer.unref();
    }
    wrap.worker.postMessage({ jobId: job.id, type: job.type, payload: job.payload });
  }

  _handleResult(wrap, msg) {
    this._clearTimer(wrap);
    const job = msg && msg.jobId ? this._jobs.get(msg.jobId) : null;

    if (job && job.status === 'running') {
      if (msg.ok) {
        job.status = 'done';
        job.result = msg.result;
      } else {
        job.status = 'failed';
        job.error  = msg.error || 'Unknown worker error';
      }
      job.finishedAt = new Date().toISOString();
      this.emit(job.status === 'done' ? 'done' : 'failed', job);
    }

    wrap.busy  = false;
    wrap.jobId = null;
    this._prune();
    this._dispatch();
  }

  _onTimeout(wrap, job) {
    if (job.status !== 'running') return;
    job.status     = 'failed';
    job.error      = `Job timed out after ${this.timeoutMs}ms`;
    job.finishedAt = new Date().toISOString();
    this.emit('failed', job);
    console.error(`[jobQueue] Job ${job.id} (${job.type}) timed out — replacing worker.`);
    this._replaceWorker(wrap);          // worker may be CPU-stuck -> kill & respawn
    this._prune();
    this._dispatch();
  }

  _handleWorkerFailure(wrap, message) {
    this._clearTimer(wrap);
    const job = wrap.jobId ? this._jobs.get(wrap.jobId) : null;
    if (job && job.status === 'running') {
      job.status     = 'failed';
      job.error      = message;
      job.finishedAt = new Date().toISOString();
      this.emit('failed', job);
      console.error(`[jobQueue] Job ${job.id} (${job.type}) failed:`, message);
    }
    this._replaceWorker(wrap);
    this._prune();
    this._dispatch();
  }

  _replaceWorker(wrap) {
    wrap.dead = true;
    this._clearTimer(wrap);
    const idx = this._workers.indexOf(wrap);
    if (idx !== -1) this._workers.splice(idx, 1);
    try { wrap.worker.terminate(); } catch (_) { /* already gone */ }
    if (!this._shuttingDown) this._spawnWorker();   // keep team size constant
  }

  _clearTimer(wrap) {
    if (wrap.timer) { clearTimeout(wrap.timer); wrap.timer = null; }
  }

  async _terminate(wrap) {
    wrap.dead = true;
    this._clearTimer(wrap);
    try { wrap.worker.postMessage({ __stop: true }); } catch (_) {}
    try { await wrap.worker.terminate(); } catch (_) {}
  }

  _prune() {
    if (this._jobs.size <= this.maxHistory) return;
    const excess = this._jobs.size - this.maxHistory;
    let removed = 0;
    for (const job of this._jobs.values()) {       // oldest-first
      if (removed >= excess) break;
      if (job.status === 'done' || job.status === 'failed') {
        this._jobs.delete(job.id);
        removed++;
      }
    }
  }
}

// Export a singleton shared across the whole process (lazy — no threads
// are spawned until the first enqueue). The class is attached for tests.
const singleton = new JobQueue();
singleton.JobQueue = JobQueue;
module.exports = singleton;
