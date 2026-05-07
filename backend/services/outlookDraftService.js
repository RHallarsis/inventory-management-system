// ================================================================
// emailService.js (outlookDraftService.js)
// Sends PO approval emails via Resend (HTTPS API — works on Railway).
//
// Railway env vars required:
//   RESEND_API_KEY  – from resend.com → API Keys (starts with re_...)
//   RESEND_FROM     – (optional) verified sender e.g. "noreply@yourdomain.com"
//                     Defaults to Resend's shared test address.
//   GMAIL_USER      – kept as reply-to so suppliers can reply to you
// ================================================================

const { Resend } = require('resend');
const fs = require('fs');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GMAIL_USER     = process.env.GMAIL_USER || '';
// Use a verified FROM domain if set, otherwise Resend's shared test address
const FROM_ADDRESS   = process.env.RESEND_FROM
  ? `Inventory Management System <${process.env.RESEND_FROM}>`
  : 'Inventory Management System <onboarding@resend.dev>';

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

/**
 * Sends an approval email to the supplier via Resend (HTTPS).
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
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set. Add it in Railway → your service → Variables.');
  }

  if (!po.supplier_email) {
    throw new Error(`No email address provided for supplier "${po.supplier_name}".`);
  }

  const resend = new Resend(RESEND_API_KEY);

  const payload = {
    from:     FROM_ADDRESS,
    to:       [po.supplier_email],
    reply_to: GMAIL_USER || undefined,
    subject:  `Purchase Order Approved – ${po.po_number} | ${po.supplier_name}`,
    html:     buildEmailBody(po),
  };

  // Attach the PO file if one was uploaded
  if (po.attachment_path && po.attachment_name && fs.existsSync(po.attachment_path)) {
    const cleanName = po.attachment_name.replace(/^\d+[-_]/, '');
    payload.attachments = [{
      filename: cleanName,
      content:  fs.readFileSync(po.attachment_path),
    }];
    console.log(`[EmailService] Attaching file: ${cleanName}`);
  }

  console.log(`[EmailService] Sending via Resend: PO ${po.po_number} → ${po.supplier_email}`);
  const { data, error } = await resend.emails.send(payload);

  if (error) {
    console.error('[EmailService] Resend error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }

  console.log(`[EmailService] Email sent. ID: ${data?.id}`);
  return data;
}

module.exports = { sendApprovedPODraft };
