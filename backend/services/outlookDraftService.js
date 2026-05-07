// ================================================================
// emailService.js (outlookDraftService.js)
// Sends an automated email via Gmail SMTP when a PO is Approved.
//
// Railway env vars required:
//   GMAIL_USER         – your Gmail address (e.g. you@gmail.com)
//   GMAIL_APP_PASSWORD – 16-char Gmail App Password (not your login password)
//
// How to get a Gmail App Password:
//   1. Go to myaccount.google.com/security
//   2. Enable 2-Step Verification
//   3. Go to myaccount.google.com/apppasswords
//   4. Create one named "Inventory App" — copy the 16-char code
// ================================================================

const nodemailer = require('nodemailer');

const GMAIL_USER         = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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
 * Sends an approval email to the supplier via Gmail SMTP.
 * Called automatically when a PO status changes to "Approved".
 *
 * @param {object} po { po_number, order_date, supplier_name, supplier_email, total_amount }
 */
async function sendApprovedPODraft(po) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('[EmailService] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email.');
    return;
  }

  if (!po.supplier_email) {
    console.warn(`[EmailService] No email address for supplier "${po.supplier_name}" — skipping.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from:    `"Inventory Management System" <${GMAIL_USER}>`,
    to:      po.supplier_email,
    cc:      GMAIL_USER,                          // keeps a copy in your Sent folder
    subject: `Purchase Order Approved – ${po.po_number} | ${po.supplier_name}`,
    html:    buildEmailBody(po),
  };

  console.log(`[EmailService] Sending approval email for PO ${po.po_number} to ${po.supplier_email}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Email sent. Message ID: ${info.messageId}`);
  return info;
}

module.exports = { sendApprovedPODraft };
