// ================================================================
// emailService.js (outlookDraftService.js)
// Sends PO approval emails via Brevo (HTTPS API — works on Railway,
// no domain verification required, free tier 300 emails/day).
//
// Railway env vars required:
//   BREVO_API_KEY  – from brevo.com → Settings → SMTP & API → API Keys
//   BREVO_FROM     – (optional) verified sender email, defaults to GMAIL_USER
//   GMAIL_USER     – your Gmail address, used as the FROM address
// ================================================================

const https = require('https');
const fs    = require('fs');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL    = process.env.BREVO_FROM || process.env.GMAIL_USER || '';
const FROM_NAME     = 'Inventory Management System';

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

/**
 * Sends an approval email to the supplier via Brevo.
 *
 * @param {object} po {
 *   po_number, order_date, supplier_name,
 *   supplier_email,   – recipient (editable in preview modal)
 *   total_amount,
 *   attachment_path,  – optional absolute path to PO file
 *   attachment_name,  – optional filename
 * }
 */
async function sendApprovedPODraft(po) {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set. Add it in Railway → your service → Variables.');
  }
  if (!FROM_EMAIL) {
    throw new Error('GMAIL_USER or BREVO_FROM is not set — needed as the sender address.');
  }
  if (!po.supplier_email) {
    throw new Error(`No email address provided for supplier "${po.supplier_name}".`);
  }

  const payload = {
    sender:      { name: FROM_NAME, email: FROM_EMAIL },
    to:          [{ email: po.supplier_email, name: po.supplier_name }],
    subject:     `Purchase Order Approved – ${po.po_number} | ${po.supplier_name}`,
    htmlContent: buildEmailBody(po),
  };

  // Add CC recipients if provided (comma-separated list)
  if (po.cc) {
    const ccList = po.cc.split(',').map(e => ({ email: e.trim() })).filter(e => e.email);
    if (ccList.length) payload.cc = ccList;
  }
  // Add BCC recipients if provided (comma-separated list)
  if (po.bcc) {
    const bccList = po.bcc.split(',').map(e => ({ email: e.trim() })).filter(e => e.email);
    if (bccList.length) payload.bcc = bccList;
  }

  // Attach the PO file if one was found on disk
  if (po.attachment_path && po.attachment_name && fs.existsSync(po.attachment_path)) {
    const cleanName = po.attachment_name.replace(/^\d+[-_]/, '');
    const content   = fs.readFileSync(po.attachment_path).toString('base64');
    payload.attachment = [{ name: cleanName, content }];
    console.log(`[EmailService] Attaching file: ${cleanName}`);
  }

  console.log(`[EmailService] Sending via Brevo: PO ${po.po_number} → ${po.supplier_email}`);
  console.log(`[EmailService] CC:`, JSON.stringify(payload.cc || null));
  console.log(`[EmailService] BCC:`, JSON.stringify(payload.bcc || null));
  const result = await brevoSend(payload);
  console.log(`[EmailService] Email sent. Message ID: ${result.messageId}`);
  return result;
}

module.exports = { sendApprovedPODraft };
