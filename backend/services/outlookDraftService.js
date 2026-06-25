// ================================================================
// emailService.js (outlookDraftService.js)
// Sends PO approval emails. Priority:
//   1. Gmail SMTP via Nodemailer (GMAIL_USER + GMAIL_APP_PASSWORD) — DMARC-safe
//   2. Brevo transactional API (BREVO_API_KEY) — fallback
//
// Railway env vars:
//   GMAIL_USER         – Gmail address used as sender
//   GMAIL_APP_PASSWORD – Gmail App Password (myaccount.google.com > Security)
//   BREVO_API_KEY      – Brevo API key (fallback only)
//   BREVO_FROM         – verified Brevo sender (if using Brevo without Gmail)
// ================================================================

const https      = require('https');
const fs         = require('fs');
const nodemailer = require('nodemailer');

const GMAIL_USER    = process.env.GMAIL_USER         || '';
const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD  || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL    = process.env.BREVO_FROM || GMAIL_USER;
const FROM_NAME     = 'Inventory Management System';
const USE_GMAIL     = !!(GMAIL_USER && GMAIL_PASS);

/** Build the HTML email body for an approved PO */
function buildEmailBody(po) {
  const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  return `
<div style="font-family:Arial,sans-serif;color:#333;max-width:680px;">
  <div style="background:#6b2e0a;padding:18px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">Purchase Order Approved</h2>
    <p style="color:#f5c88a;margin:4px 0 0;font-size:0.9rem;">
      PO # ${po.po_number} &mdash; ${po.order_date}
    </p>
  </div>
  <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:22px;border-radius:0 0 8px 8px;">
    <p>Dear <strong>${po.supplier_name}</strong>,</p>
    <p>We are pleased to inform you that the following Purchase Order has been <strong>approved</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:0.88rem;">
      <tr style="background:#f5f5f5;">
        <td style="padding:9px;font-weight:bold;width:40%;">PO Number</td>
        <td style="padding:9px;">${po.po_number}</td>
      </tr>
      <tr>
        <td style="padding:9px;font-weight:bold;">Order Date</td>
        <td style="padding:9px;">${po.order_date}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:9px;font-weight:bold;">Supplier</td>
        <td style="padding:9px;">${po.supplier_name}</td>
      </tr>
      <tr>
        <td style="padding:9px;font-weight:bold;">Total Amount</td>
        <td style="padding:9px;color:#6b2e0a;font-weight:bold;">Php ${fmt(po.total_amount)}</td>
      </tr>
    </table>
    <p>Please confirm receipt and provide an expected delivery schedule at your earliest convenience.</p>
    <p>Thank you for your continued partnership.</p>
    <p style="font-size:0.75rem;color:#999;margin-top:20px;">
      This is an automated notification from the Inventory Management System.
    </p>
  </div>
</div>`;
}

/** Call Brevo's transactional email API over HTTPS */
function brevoSend(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'api-key':        BREVO_API_KEY,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Brevo API request timed out')); });
    req.write(body);
    req.end();
  });
}

// Parse CC/BCC — accept comma or semicolon, strip display-name format
function parseEmailList(raw) {
  if (!raw) return [];
  return raw.split(/[,;]/).map(e => e.trim()).filter(Boolean).map(e => {
    const m = e.match(/<([^>]+)>/);
    return m ? m[1].trim() : e;
  }).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

/** Send via Gmail SMTP — DMARC-safe, emails come from Google's servers */
async function sendViaGmail(po, subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  const ccList  = parseEmailList(po.cc);
  const bccList = parseEmailList(po.bcc);
  const mailOpts = {
    from:    `"${FROM_NAME}" <${GMAIL_USER}>`,
    to:      po.supplier_email,
    subject,
    html:    htmlBody,
  };
  if (ccList.length)  mailOpts.cc  = ccList.join(', ');
  if (bccList.length) mailOpts.bcc = bccList.join(', ');
  if (po.attachment_path && po.attachment_name && fs.existsSync(po.attachment_path)) {
    const cleanName = po.attachment_name.replace(/^\d+[-_]/, '');
    mailOpts.attachments = [{ filename: cleanName, path: po.attachment_path }];
    console.log(`[EmailService/Gmail] Attaching: ${cleanName}`);
  }
  console.log(`[EmailService/Gmail] Sending PO ${po.po_number} → ${po.supplier_email} | cc:${ccList} bcc:${bccList}`);
  const info = await transporter.sendMail(mailOpts);
  console.log(`[EmailService/Gmail] Done. MessageId: ${info.messageId}`);
  return info;
}

/** Send via Brevo API — fallback when Gmail SMTP not configured */
async function sendViaBrevo(po, subject, htmlBody) {
  if (!BREVO_API_KEY) throw new Error('No email provider configured. Set GMAIL_APP_PASSWORD (recommended) or BREVO_API_KEY in Railway.');
  if (!FROM_EMAIL)    throw new Error('Set GMAIL_USER in Railway variables.');
  const ccObjs  = parseEmailList(po.cc).map(e => ({ email: e }));
  const bccObjs = parseEmailList(po.bcc).map(e => ({ email: e }));
  const payload = {
    sender:      { name: FROM_NAME, email: FROM_EMAIL },
    to:          [{ email: po.supplier_email, name: po.supplier_name }],
    replyTo:     GMAIL_USER ? { email: GMAIL_USER } : undefined,
    subject,
    htmlContent: htmlBody,
  };
  if (ccObjs.length)  payload.cc  = ccObjs;
  if (bccObjs.length) payload.bcc = bccObjs;
  if (po.attachment_path && po.attachment_name && fs.existsSync(po.attachment_path)) {
    const cleanName = po.attachment_name.replace(/^\d+[-_]/, '');
    payload.attachment = [{ name: cleanName, content: fs.readFileSync(po.attachment_path).toString('base64') }];
    console.log(`[EmailService/Brevo] Attaching: ${cleanName}`);
  }
  console.log(`[EmailService/Brevo] Sending PO ${po.po_number} → ${po.supplier_email}`);
  const result = await brevoSend(payload);
  console.log(`[EmailService/Brevo] Done. MessageId: ${result.messageId}`);
  return result;
}

async function sendApprovedPODraft(po) {
  if (!po.supplier_email) throw new Error(`No email address for supplier "${po.supplier_name}".`);
  const subject  = `Purchase Order Approved – ${po.po_number} | ${po.supplier_name}`;
  const htmlBody = buildEmailBody(po);
  if (USE_GMAIL) {
    console.log('[EmailService] Provider: Gmail SMTP');
    return sendViaGmail(po, subject, htmlBody);
  }
  console.log('[EmailService] Provider: Brevo API');
  return sendViaBrevo(po, subject, htmlBody);
}

module.exports = { sendApprovedPODraft };
