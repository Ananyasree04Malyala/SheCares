const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getSmtpConfig() {
  const host = (env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(env.SMTP_PORT) || 587;
  const user = (env.SMTP_USER || 'ananyasree.malyala02@gmail.com').trim();
  const pass = (env.SMTP_PASSWORD || 'xkjvouvqwiyihzyj').replace(/\s+/g, '');
  const from = (env.SMTP_FROM || user).trim();
  return { host, port, user, pass, from };
}

function configured() {
  const cfg = getSmtpConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

function getTransporter() {
  if (!configured()) return null;
  if (!transporter) {
    const cfg = getSmtpConfig();
    const isGmail = cfg.host.includes('gmail') || cfg.user.includes('@gmail.com');

    if (isGmail) {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: cfg.user,
          pass: cfg.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: {
          user: cfg.user,
          pass: cfg.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }
  return transporter;
}

async function sendMail(options) {
  const cfg = getSmtpConfig();
  const t = getTransporter();
  if (!t) {
    console.warn('[EMAIL] SMTP transporter not configured.');
    return { sent: false, configured: false };
  }

  try {
    const mailOptions = {
      from: options.from || `"SHECARES" <${cfg.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await t.sendMail(mailOptions);
    console.log('[EMAIL] Successfully delivered email via SMTP:', info.messageId);
    return { sent: true, configured: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL] SMTP delivery failed:', err.message);
    return { sent: false, configured: true, error: err.message };
  }
}

async function sendPasswordReset(to, name, link) {
  return sendMail({
    to,
    subject: 'SHECARES Password Reset',
    text: `Hello ${name || 'there'},\n\nUse this link to reset your SHECARES password:\n${link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`,
    html: `<p>Hello ${name || 'there'},</p><p>Use the link below to reset your SHECARES password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes.</p>`
  });
}

async function sendLoginOtpMail(to, name, code, identifier) {
  return sendMail({
    to,
    subject: 'SHECARES Login Verification Code',
    text: `Hello ${name || 'there'},\n\nYour SHECARES login verification code is: ${code}\n\nIt expires in 10 minutes. Never share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;padding:20px;border:1px solid #f3d4e1;border-radius:12px;">
        <h2 style="color:#e83e83;margin-top:0;">SHECARES Login Verification</h2>
        <p>Hello ${name || 'there'},</p>
        <p>You requested a login verification code for your SHECARES account:</p>
        <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;">
          <p style="margin:0;font-size:14px;color:#333;font-weight:600;">Your 6-Digit Login Code:</p>
          <p style="margin:4px 0 0;font-size:32px;font-weight:700;letter-spacing:6px;color:#e83e83;">${code}</p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#777;">This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
      </div>`
  });
}

module.exports = { configured, sendMail, sendPasswordReset, sendLoginOtpMail };
