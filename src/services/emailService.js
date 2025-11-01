const nodemailer = require('nodemailer');
const { passwordReset } = require('../config/auth');
const emailConfig = require('../config/email');
const { invite: collaboratorInvite } = require('../config/collaboration');

const buildResetLink = (token) => {
  const baseUrl = passwordReset.baseUrl || 'http://localhost:5173';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/reset-password?token=${token}`;
};

const buildCollaboratorInviteLink = (token) => {
  const baseUrl = collaboratorInvite.baseUrl || 'http://localhost:5173';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/accept-invite?token=${encodeURIComponent(token)}`;
};

let transporter = null;

const canSendEmail = () => emailConfig.isConfigured && process.env.NODE_ENV !== 'test';

const ensureTransporter = () => {
  if (!canSendEmail()) {
    return null;
  }

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

  return transporter;
};

const sendPasswordResetEmail = async ({ to, token, expiresAt, firstName }) => {
  const resetLink = buildResetLink(token);
  const friendlyName = firstName ? firstName : 'traveler';

  if (!canSendEmail()) {
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
    const mailer = ensureTransporter();
    if (!mailer) {
      return;
    }

    await mailer.sendMail({
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

const sendCollaboratorInviteEmail = async ({
  to,
  token,
  tripName,
  permissionLevel,
  inviter,
  expiresAt,
  isResend = false,
}) => {
  const inviteLink = buildCollaboratorInviteLink(token);
  const friendlyPermission =
    {
      view: 'view-only',
      edit: 'editor',
      admin: 'admin',
    }[permissionLevel] || permissionLevel;

  const inviterDisplay = inviter?.name || 'A Travel Checklist organizer';
  const subject = isResend
    ? `Reminder: Access the "${tripName}" trip`
    : `${inviterDisplay} invited you to "${tripName}" on Travel Checklist`;

  if (!canSendEmail()) {
    // eslint-disable-next-line no-console
    console.warn(
      `[smtp-not-configured] Unable to send collaborator invite email to ${to}. Invite link: ${inviteLink}`
    );
    return;
  }

  const expiresLine = expiresAt ? `This invitation expires on ${expiresAt.toISOString()}.

` : '';
  const textBody = `Hi there,

${inviterDisplay} invited you to collaborate on the "${tripName}" trip in Travel Checklist.
You have been granted ${friendlyPermission} access.

Accept the invitation: ${inviteLink}
${expiresLine}If you do not recognize this invitation, you can ignore this email.`;

  const htmlBody = `
    <p>Hi there,</p>
    <p>${inviterDisplay} invited you to collaborate on the <strong>${tripName}</strong> trip in Travel Checklist.</p>
    <p>You have been granted <strong>${friendlyPermission}</strong> access.</p>
    <p><a href="${inviteLink}">Accept the invitation</a></p>
    ${expiresAt ? `<p>This invitation expires on <strong>${expiresAt.toISOString()}</strong>.</p>` : ''}
    <p>If you do not recognize this invitation, you can safely ignore this message.</p>
  `;

  try {
    const mailer = ensureTransporter();
    if (!mailer) {
      return;
    }

    await mailer.sendMail({
      from: emailConfig.fromEmail,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[smtp-error] Failed to send collaborator invite email', { to, error });
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendCollaboratorInviteEmail,
};
