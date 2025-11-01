require('dotenv').config();

const user = process.env.GMAIL_SMTP_USER || '';
const pass = process.env.GMAIL_SMTP_PASS || '';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number.parseInt(process.env.SMTP_PORT, 10) || 587;
const secure = process.env.SMTP_SECURE === 'true' || port === 465;

const fromEmail =
  process.env.EMAIL_FROM ||
  (user ? `Travel Checklist <${user}>` : 'Travel Checklist <no-reply@example.com>');

module.exports = {
  user,
  pass,
  host,
  port,
  secure,
  fromEmail,
  isConfigured: Boolean(user && pass),
};

