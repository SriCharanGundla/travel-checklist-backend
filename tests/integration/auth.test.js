const authService = require('../../src/services/authService');
const { RefreshToken } = require('../../src/models');
const AppError = require('../../src/utils/AppError');

const buildContext = () => ({
  ipAddress: '127.0.0.1',
  userAgent: 'jest-test-suite',
});

const buildUserPayload = (overrides = {}) => ({
  email: 'Traveler@example.com',
  password: 'Sup3r$ecure!',
  firstName: '  Ada  ',
  lastName: 'Lovelace',
  timezone: 'Europe/London',
  ...overrides,
});

describe('Auth Service Integration', () => {
  it('registers a new user and normalizes profile fields', async () => {
    const { user, tokens } = await authService.register(buildUserPayload(), buildContext());

    expect(user).toMatchObject({
      email: 'traveler@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      timezone: 'Europe/London',
    });
    expect(tokens).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    );
    expect(tokens.refreshTokenExpiresAt).toBeInstanceOf(Date);
  });

  it('logs in an existing user and enforces credential checks', async () => {
    const credentials = buildUserPayload();
    await authService.register(credentials, buildContext());

    const loginResult = await authService.login(
      { email: credentials.email.toUpperCase(), password: credentials.password },
      buildContext()
    );

    expect(loginResult.user.email).toBe('traveler@example.com');
    expect(loginResult.tokens.accessToken).toEqual(expect.any(String));

    await expect(
      authService.login({ email: credentials.email, password: 'WrongPass1!' }, buildContext())
    ).rejects.toThrow(AppError);
  });

  it('rotates refresh tokens and revokes the previous token', async () => {
    const { tokens } = await authService.register(buildUserPayload(), buildContext());
    const originalRefreshToken = tokens.refreshToken;

    const refreshResult = await authService.refreshTokens(originalRefreshToken, buildContext());
    expect(refreshResult.tokens.refreshToken).not.toBe(originalRefreshToken);

    const refreshTokens = await RefreshToken.findAll({ order: [['createdAt', 'ASC']] });
    expect(refreshTokens).toHaveLength(2);
    expect(refreshTokens[0].revokedAt).not.toBeNull();
  });
});
