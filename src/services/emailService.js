const nodemailer = require('nodemailer');
const { passwordReset } = require('../config/auth');
const emailConfig = require('../config/email');

const buildResetLink = (token) => {
  const baseUrl = passwordReset.baseUrl || 'http://localhost:5173';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/reset-password?token=${token}`;
};

let transporter = null;

const sendPasswordResetEmail = async ({ to, token, expiresAt, firstName }) => {
  const resetLink = buildResetLink(token);
  const friendlyName = firstName ? firstName : 'traveler';

  if (!emailConfig.isConfigured) {
    // eslint-disable-next-line no-console
    console.warn(
      `[smtp-not-configured] Unable to send password reset email to ${to}. Generated link: ${resetLink} (expires ${expiresAt.toISOString()})`
    );
    return;
  }

  const subject = 'Reset your Travel Checklist password';
  const textBody = `Hi ${friendlyName},

We received a request to reset the password for your Travel Checklist account.

Reset link: ${resetLink}
This link expires on ${expiresAt.toISOString()}.

If you did not request this change, you can safely ignore this email.`;

  const htmlBody = `
    <p>Hi ${friendlyName},</p>
    <p>We received a request to reset the password for your Travel Checklist account.</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>This link expires on <strong>${expiresAt.toISOString()}</strong>.</p>
    <p>If you did not request this change, you can safely ignore this email.</p>
  `;

  try {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.pass,
        },
      });
    }

    await transporter.sendMail({
      from: emailConfig.fromEmail,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[smtp-error] Failed to send password reset email', { to, error });
  }
};

module.exports = {
  sendPasswordResetEmail,
};
