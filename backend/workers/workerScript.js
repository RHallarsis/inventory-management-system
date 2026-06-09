/**
 * workerScript.js — Pooled Worker Thread Entry Point
 *
 * Runs inside a long-lived OS thread spawned once by jobQueue.js and
 * REUSED across many jobs (a persistent "team" member). It waits in a
 * message loop: the pool posts { jobId, type, payload }, the worker runs
 * the matching handler, then posts back { jobId, ok, result } or
 * { jobId, ok:false, error }. The thread then idles, ready for the next job.
 *
 * Supported job types:
 *  - low-stock-check      Scan products for low / out-of-stock alerts.
 *  - reorder-calc         Calculate reorder points for spare parts.
 *  - bulk-status-recalc   Re-derive status strings for a batch of products.
 *  - report-summary       Compile a full management report snapshot.
 */

'use strict';

const { parentPort } = require('worker_threads');

// ── Helpers ────────────────────────────────────────────────────────────────

function calcStatus(qty) {
  if (qty === 0)  return 'Out of Stock';
  if (qty <= 10)  return 'Low Stock';
  return 'In Stock';
}

// ── Job handlers ───────────────────────────────────────────────────────────

/**
 * low-stock-check
 * Payload: { products: Product[], threshold?: number }
 * Returns:  { alerts: Alert[], totalScanned: number, scannedAt: string }
 */
function handleLowStockCheck({ products = [], threshold = 10 }) {
  const alerts = products
    .filter(p => p.quantity <= threshold)
    .map(p => ({
      id:           p.id,
      product_code: p.product_code,
      name:         p.name,
      category:     p.category,
      quantity:     p.quantity,
      unit_price:   p.unit_price,
      status:       calcStatus(p.quantity),
      severity:     p.quantity === 0 ? 'critical' : 'warning',
    }))
    .sort((a, b) => a.quantity - b.quantity); // most urgent first

  return {
    alerts,
    totalScanned: products.length,
    alertCount:   alerts.length,
    scannedAt:    new Date().toISOString(),
  };
}

/**
 * reorder-calc
 * Payload: { spareParts: SparePart[] }
 * Returns:  { results: ReorderResult[], calculatedAt: string }
 *
 * Formula:
 *   daily_usage   = monthly_usage / 30
 *   lead_time_days= lead_time (months) × 30
 *   reorder_point = ceil(daily_usage × lead_time_days + safety_stock)
 *   suggested_qty = max(0, reorder_point + buffer − on_hand − on_order)
 */
function handleReorderCalc({ spareParts = [] }) {
  const results = spareParts.map(sp => {
    const dailyUsage    = sp.monthly_usage / 30;
    const leadTimeDays  = sp.lead_time * 30;
    const reorderPoint  = Math.ceil(dailyUsage * leadTimeDays + (sp.safety_stock ?? 1));
    const needsReorder  = sp.on_hand <= reorderPoint;
    const suggestedQty  = needsReorder
      ? Math.max(0, reorderPoint + (sp.buffer ?? 3) - sp.on_hand - sp.on_order)
      : 0;

    return {
      id:             sp.id,
      name:           sp.name,
      part_no:        sp.part_no,
      machine:        sp.machine,
      on_hand:        sp.on_hand,
      on_order:       sp.on_order,
      monthly_usage:  sp.monthly_usage,
      lead_time:      sp.lead_time,
      reorderPoint,
      needsReorder,
      suggestedOrderQty: suggestedQty,
      urgency: sp.on_hand === 0 ? 'critical' : needsReorder ? 'warning' : 'ok',
    };
  });

  const needsReorderCount = results.filter(r => r.needsReorder).length;

  return {
    results,
    totalParts:        spareParts.length,
    needsReorderCount,
    calculatedAt:      new Date().toISOString(),
  };
}

/**
 * bulk-status-recalc
 * Payload: { products: Product[] }
 * Returns:  { updates: { id, status }[] }
 *
 * Useful after a bulk stock import — pass all rows, get back
 * only the ones whose status string has changed.
 */
function handleBulkStatusRecalc({ products = [] }) {
  const updates = products
    .map(p => ({ id: p.id, status: calcStatus(p.quantity), quantity: p.quantity }))
    .filter(u => u.status !== products.find(p => p.id === u.id)?.status);

  return {
    updates,
    totalProcessed: products.length,
    changedCount:   updates.length,
    recalcAt:       new Date().toISOString(),
  };
}

/**
 * report-summary
 * Payload: { products: Product[], spareParts: SparePart[] }
 * Returns:  Full management snapshot
 */
function handleReportSummary({ products = [], spareParts = [] }) {
  // ── Products ──────────────────────────────────────────────
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);

  const byCategory = {};
  for (const p of products) {
    if (!byCategory[p.category]) {
      byCategory[p.category] = { itemCount: 0, totalQty: 0, totalValue: 0, lowStock: 0, outOfStock: 0 };
    }
    const cat = byCategory[p.category];
    cat.itemCount++;
    cat.totalQty   += p.quantity;
    cat.totalValue += p.quantity * p.unit_price;
    if (p.quantity === 0)       cat.outOfStock++;
    else if (p.quantity <= 10)  cat.lowStock++;
  }

  // Round category values
  for (const cat of Object.values(byCategory)) {
    cat.totalValue = Math.round(cat.totalValue * 100) / 100;
  }

  // Top 5 by value
  const topByValue = [...products]
    .sort((a, b) => (b.quantity * b.unit_price) - (a.quantity * a.unit_price))
    .slice(0, 5)
    .map(p => ({
      product_code: p.product_code,
      name:         p.name,
      category:     p.category,
      quantity:     p.quantity,
      stockValue:   Math.round(p.quantity * p.unit_price * 100) / 100,
    }));

  // ── Spare Parts ───────────────────────────────────────────
  const sparePartsNeedReorder = spareParts.filter(sp => {
    const reorderPoint = Math.ceil(
      (sp.monthly_usage / 30) * (sp.lead_time * 30) + (sp.safety_stock ?? 1)
    );
    return sp.on_hand <= reorderPoint;
  }).length;

  const sparePartsCritical = spareParts.filter(sp => sp.on_hand === 0).length;

  // ── Summary ───────────────────────────────────────────────
  return {
    products: {
      total:      products.length,
      inStock:    products.filter(p => p.quantity > 10).length,
      lowStock:   products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
      outOfStock: products.filter(p => p.quantity === 0).length,
      totalValue: Math.round(totalValue * 100) / 100,
      byCategory,
      topByValue,
    },
    spareParts: {
      total:             spareParts.length,
      needsReorder:      sparePartsNeedReorder,
      criticalZeroStock: sparePartsCritical,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

const handlers = {
  'low-stock-check':    handleLowStockCheck,
  'reorder-calc':       handleReorderCalc,
  'bulk-status-recalc': handleBulkStatusRecalc,
  'report-summary':     handleReportSummary,
};

if (!parentPort) {
  throw new Error('[workerScript] Must be run as a worker thread.');
}

// Persistent message loop: one message == one job. The worker stays
// alive between jobs so the pool can reuse it (no per-job thread spawn).
parentPort.on('message', (msg) => {
  // Graceful stop signal from the pool.
  if (msg && msg.__stop) {
    process.exit(0);
    return;
  }

  const { jobId, type, payload } = msg || {};
  const handler = handlers[type];

  if (!handler) {
    parentPort.postMessage({
      jobId,
      ok: false,
      error: `Unknown job type: "${type}"`,
    });
    return;
  }

  try {
    const result = handler(payload || {});
    parentPort.postMessage({ jobId, ok: true, result });
  } catch (err) {
    parentPort.postMessage({
      jobId,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

// Tell the pool this worker is up and idle.
parentPort.postMessage({ __ready: true });
