// Vercel Serverless Function: /api/send-otp
// Dispatches real-world OTP emails exclusively via SMTP (Gmail SMTP / Standard SMTP)
// Uses stateless cryptographic HMAC tokens so no database or backend server is needed.

import crypto from 'node:crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'mln-alliance-mediacrew-secure-key-2026';

function createHashToken(email, otp, expiresAt) {
  const data = `${email.toLowerCase()}:${otp}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${expiresAt}:${signature}`;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid student email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Generate secure 6-digit OTP (e.g. 588713)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Valid for 5 minutes
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const hashToken = createHashToken(cleanEmail, otp, expiresAt);

  // Skip real SMTP dispatch for dummy/test emails to prevent mailer-daemon bounces
  const isTestEmail = cleanEmail === 'test@gmail.com' || cleanEmail === 'demo@gmail.com' || cleanEmail.endsWith('@example.com') || cleanEmail.endsWith('@test.com');
  if (isTestEmail) {
    return res.status(200).json({
      success: true,
      mode: 'test_simulated',
      hashToken,
      message: `Test verification code simulated for ${cleanEmail} (real SMTP skipped to prevent mailer-daemon bounce).`
    });
  }

  const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const isSecure = smtpPort === 465;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your MLN Verification Code</title>
    </head>
    <body style="margin:0; padding:0; background-color:#0b0807; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#fdf7f2;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0807; padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:520px; background:linear-gradient(145deg, #18120f 0%, #0e0a08 100%); border:1px solid rgba(255, 211, 174, 0.2); border-radius:18px; padding:36px 30px; box-shadow:0 20px 45px rgba(0,0,0,0.8);">
              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <div style="font-size:20px; font-weight:800; letter-spacing:-0.03em; color:#ef7657;">
                    MLN ALLIANCE MEDIACREW
                  </div>
                  <div style="font-size:12px; color:#a89c92; letter-spacing:0.12em; text-transform:uppercase; margin-top:4px;">
                    Member Identity Verification
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0 20px; color:#e0d6ce; font-size:15px; line-height:1.6; text-align:center;">
                  You requested to register or edit your digital member portfolio pass for <strong>${cleanEmail}</strong>.
                  Use the 6-digit security code below:
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:15px 0 25px;">
                  <div style="display:inline-block; background:rgba(0, 242, 161, 0.08); border:1.5px dashed #00f2a1; border-radius:14px; padding:18px 36px; text-align:center;">
                    <span style="font-family:'Courier New', Courier, monospace; font-size:38px; font-weight:900; letter-spacing:10px; color:#00f2a1;">${otp}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="color:#9e9287; font-size:13px; line-height:1.5; text-align:center; padding-bottom:25px;">
                  ⏱ This security code will expire in <strong>5 minutes</strong>.<br>
                  If you did not request this verification, please disregard this email.
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid rgba(255,224,201,0.12); padding-top:20px; text-align:center; font-size:11px; color:#6b6058;">
                  MLN Alliance MediaCrew &bull; BBA Department &bull; Official Digital Portal
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // DISPATCH EXCLUSIVELY VIA SMTP (Gmail SMTP / Standard SMTP)
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 10000
      });

      await transporter.sendMail({
        from: `MLN Alliance MediaCrew <${smtpUser}>`,
        to: cleanEmail,
        subject: `${otp} is your MLN Alliance MediaCrew Security Code`,
        html: emailHtml
      });

      return res.status(200).json({
        success: true,
        mode: 'email_sent',
        hashToken: hashToken,
        message: `Verification code dispatched via SMTP to ${cleanEmail}.`
      });
    } catch (smtpErr) {
      console.error('SMTP error on Vercel:', smtpErr);
      return res.status(200).json({
        success: true,
        mode: 'demo_fallback',
        otp: otp,
        hashToken: hashToken,
        message: 'SMTP notice: ' + (smtpErr.message || 'Check SMTP credentials.')
      });
    }
  }

  // Fallback demo mode if SMTP credentials are missing
  return res.status(200).json({
    success: true,
    mode: 'demo',
    otp: otp,
    hashToken: hashToken,
    message: 'Demo mode active. Configure GMAIL_USER & GMAIL_APP_PASSWORD in Vercel to dispatch real emails directly to inboxes.'
  });
}
