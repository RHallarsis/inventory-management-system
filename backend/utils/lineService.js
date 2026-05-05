/**
 * lineService.js
 * Shared Line Messaging API helpers.
 * Supports both single-user push and broadcast-to-all-friends.
 */

const LINE_PUSH_URL      = 'https://api.line.me/v2/bot/message/push';
const LINE_BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

// ── Internal fetch helper ────────────────────────────────────────────────────
async function _linePost(url, token, body) {
  const res = await fetch(url, {
    method : 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type' : 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `LINE API error ${res.status}`);
  }
  return true;
}

// ── Push to a single user ────────────────────────────────────────────────────
async function pushLine(token, userId, messages) {
  return _linePost(LINE_PUSH_URL, token, { to: userId, messages });
}

// ── Broadcast to ALL friends / followers ─────────────────────────────────────
async function broadcastLine(token, messages) {
  return _linePost(LINE_BROADCAST_URL, token, { messages });
}

// ── Build a calendar-task notification message ───────────────────────────────
function buildCalendarMessage(task, action = 'created') {
  const today    = new Date().toISOString().slice(0, 10);
  const overdue  = task.task_date < today;
  const prioFlag = overdue
    ? '🚫 OVERDUE'
    : task.priority === 'High'
    ? '🚨 HIGH PRIORITY'
    : task.priority === 'Medium'
    ? '📋 MEDIUM'
    : '📝 LOW';

  const actionLabel = action === 'created' ? '🆕 New Task Added' : '✏️ Task Updated';
  const dateLabel   = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const text = [
    `🔔 Inventory Management System`,
    `${actionLabel} — ${dateLabel}`,
    ``,
    `${prioFlag}`,
    `📌 ${task.title}`,
    task.description ? `📝 ${task.description}` : null,
    ``,
    `📅 Date     : ${task.task_date}`,
    `🏷️  Category : ${task.category}`,
    `⚡ Priority : ${task.priority}`,
    `🔄 Status   : ${task.status}`,
  ]
    .filter(line => line !== null)
    .join('\n');

  return [{ type: 'text', text }];
}

module.exports = { pushLine, broadcastLine, buildCalendarMessage };
