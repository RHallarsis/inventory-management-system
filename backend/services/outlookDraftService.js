// ================================================================
// outlookDraftService.js
// Creates an Outlook draft via Microsoft Graph API when a PO
// status changes to "Approved".
//
// Railway env vars required:
//   OUTLOOK_TENANT_ID, OUTLOOK_CLIENT_ID,
//   OUTLOOK_CLIENT_SECRET, OUTLOOK_SENDER_EMAIL
// ================================================================

const https = require('https');

const TENANT_ID     = process.env.OUTLOOK_TENANT_ID;
const CLIENT_ID     = process.env.OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const SENDER_EMAIL  = process.env.OUTLOOK_SENDER_EMAIL;

/** Fetch OAuth2 access token (client_credentials flow) */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope:         'https://graph.microsoft.com/.default',
    }).toString();
    const options = {
      hostname: 'login.microsoftonline.com',
      path:     `/${TENANT_ID}/oauth2/v2.0/token`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        const p = JSON.parse(data);
        if (p.access_token) resolve(p.access_token);
        else reject(new Error(`Token error: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Call Graph API to save a draft message in the sender's mailbox */
async function createOutlookDraft(accessToken, draftPayload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(draftPayload);
    const options = {
      hostname: 'graph.microsoft.com',
      path:     `/v1.0/users/${SENDER_EMAIL}/messages`,
      method:   'POST',
      headers:  {
        'Authorization':  `Bearer ${accessToken}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (res.statusCode === 201) resolve(JSON.parse(data));
        else reject(new Error(`Graph API ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Build the HTML body for the approved-PO email */
function buildEmailBody(po) {
  const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  return `
<div style="font-family:Arial,sans-serif;color:#333;max-width:680px;">
  <div style="background:#6b2e0a;padding:18px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">Purchase Order Approved</h2>
    <p style="color:#f5c88a;margin:4px 0 0;font-size:0.9rem;">PO # ${po.po_number} &mdash; ${po.order_date}</p>
  </div>
  <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:22px;border-radius:0 0 8px 8px;">
    <p>Dear <strong>${po.supplier_name}</strong>,</p>
    <p>We are pleased to inform you that the following Purchase Order has been <strong>approved</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:0.88rem;">
      <tr style="background:#f5f5f5;"><td style="padding:9px;font-weight:bold;width:40%;">PO Number</td><td style="padding:9px;">${po.po_number}</td></tr>
      <tr><td style="padding:9px;font-weight:bold;">Order Date</td><td style="padding:9px;">${po.order_date}</td></tr>
      <tr style="background:#f5f5f5;"><td style="padding:9px;font-weight:bold;">Supplier</td><td style="padding:9px;">${po.supplier_name}</td></tr>
      <tr><td style="padding:9px;font-weight:bold;">Total Amount</td><td style="padding:9px;color:#6b2e0a;font-weight:bold;">Php ${fmt(po.total_amount)}</td></tr>
    </table>
    <p>Please confirm receipt and provide an expected delivery schedule at your earliest convenience.</p>
    <p>Thank you for your continued partnership.</p>
    <p style="font-size:0.75rem;color:#999;margin-top:20px;">This is an automated notification from the Inventory Management System.</p>
  </div>
</div>`;
}

/**
 * Main export — call this when a PO is approved.
 * @param {object} po  { po_number, order_date, supplier_name, supplier_email, total_amount }
 */
async function sendApprovedPODraft(po) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SENDER_EMAIL) {
    console.warn('[OutlookDraft] Missing env vars — skipping draft creation.');
    return;
  }
  console.log(`[OutlookDraft] Creating draft for PO ${po.po_number}...`);
  const token = await getAccessToken();
  const draft = await createOutlookDraft(token, {
    subject:    `Purchase Order Approved – ${po.po_number} | ${po.supplier_name}`,
    importance: 'Normal',
    isDraft:    true,
    body:       { contentType: 'HTML', content: buildEmailBody(po) },
    toRecipients: [
      { emailAddress: { address: po.supplier_email || '', name: po.supplier_name } },
    ],
  });
  console.log(`[OutlookDraft] Draft saved. ID: ${draft.id}`);
  return draft;
}

module.exports = { sendApprovedPODraft };
