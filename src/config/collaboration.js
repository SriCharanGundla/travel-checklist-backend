require('dotenv').config();

const inviteBaseUrl =
  process.env.COLLABORATOR_INVITE_BASE_URL ||
  process.env.FRONTEND_APP_URL ||
  process.env.CLIENT_URL ||
  'http://localhost:5173';

module.exports = {
  invite: {
    baseUrl: inviteBaseUrl,
  },
};
