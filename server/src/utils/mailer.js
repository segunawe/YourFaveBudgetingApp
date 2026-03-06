const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Fire-and-forget email sender. Logs errors but does not throw.
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
const sendMail = (to, subject, html) => {
  if (!process.env.GMAIL_USER) return;
  transport.sendMail({
    from: `"AJOIN" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  }).catch(err => console.error('[Mailer] Failed to send email:', err.message));
};

// --- Shared layout ---

const wrap = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1976d2;padding:20px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">AJOIN</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #eeeeee;color:#9e9e9e;font-size:12px;">
            You're receiving this because your AJOIN notification preferences are enabled.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text) =>
  `<a style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1976d2;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">${text}</a>`;

// --- Template functions ---

const friendRequestEmail = ({ fromName }) =>
  wrap(`
    <h2 style="margin:0 0 12px;color:#212121;">New Friend Request</h2>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0 0 8px;">
      <strong>${fromName}</strong> sent you a friend request on AJOIN.
    </p>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0;">
      Log in to accept or decline.
    </p>
    ${btn('View Request')}
  `);

const friendAcceptedEmail = ({ fromName }) =>
  wrap(`
    <h2 style="margin:0 0 12px;color:#212121;">Friend Request Accepted</h2>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0;">
      <strong>${fromName}</strong> accepted your friend request. You're now connected on AJOIN!
    </p>
    ${btn('Go to Dashboard')}
  `);

const contributionFailedEmail = ({ bucketName, amount, reason }) =>
  wrap(`
    <h2 style="margin:0 0 12px;color:#d32f2f;">Payment Failed</h2>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0 0 8px;">
      Your $${amount.toFixed(2)} contribution to <strong>${bucketName}</strong> could not be processed.
    </p>
    <p style="color:#757575;font-size:13px;margin:0 0 4px;">Reason: ${reason}</p>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:8px 0 0;">
      Please check your bank account and try again.
    </p>
    ${btn('View Bucket')}
  `);

const goalReachedEmail = ({ bucketName, goalAmount }) =>
  wrap(`
    <h2 style="margin:0 0 12px;color:#2e7d32;">Goal Reached! 🎉</h2>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0 0 8px;">
      Your savings bucket <strong>${bucketName}</strong> has reached its goal of <strong>$${goalAmount.toFixed(2)}</strong>!
    </p>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0;">
      Log in to collect your funds.
    </p>
    ${btn('View Bucket')}
  `);

const voteNeededEmail = ({ bucketName }) =>
  wrap(`
    <h2 style="margin:0 0 12px;color:#212121;">Vote to Collect Funds</h2>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0 0 8px;">
      The savings bucket <strong>${bucketName}</strong> has reached its goal and is ready to collect.
    </p>
    <p style="color:#424242;font-size:15px;line-height:1.6;margin:0;">
      Your vote is needed to approve the payout.
    </p>
    ${btn('Cast My Vote')}
  `);

module.exports = {
  sendMail,
  friendRequestEmail,
  friendAcceptedEmail,
  contributionFailedEmail,
  goalReachedEmail,
  voteNeededEmail,
};
