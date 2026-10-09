const nodemailer = require('nodemailer');
const env = require('../config/env');
let transporter = null;
function configured(){ return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM); }
function getTransporter(){ if(!configured()) return null; if(!transporter) transporter = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }); return transporter; }
async function sendMail(options){ const t = getTransporter(); if(!t) return { sent:false, configured:false }; await t.sendMail(options); return { sent:true, configured:true }; }
async function sendPasswordReset(to, name, link){ return sendMail({ from: env.SMTP_FROM, to, subject: 'SheCare password reset', text: `Hello ${name || 'there'},\n\nUse this link to reset your SheCare password:\n${link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`, html: `<p>Hello ${name || 'there'},</p><p>Use the link below to reset your SheCare password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes.</p>` }); }
async function sendLoginOtpMail(to, name, code, identifier){
  return sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'SheCare login verification code',
    text: `Hello ${name || 'there'},\n\nYour SheCare login verification code is: ${code}\n\nIt expires in 10 minutes. Never share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;padding:20px;border:1px solid #f3d4e1;border-radius:12px;">
        <h2 style="color:#e83e83;margin-top:0;">SHECARES Login Verification</h2>
        <p>Hello ${name || 'there'},</p>
        <p>You requested a login verification code for your SheCare account:</p>
        <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;">
          <p style="margin:0;font-size:14px;color:#333;font-weight:600;">Your 6-Digit Login Code:</p>
          <p style="margin:4px 0 0;font-size:32px;font-weight:700;letter-spacing:6px;color:#e83e83;">${code}</p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#777;">This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
      </div>`
  });
}
module.exports = { configured, sendMail, sendPasswordReset, sendLoginOtpMail };

