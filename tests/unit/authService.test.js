const authService = require('../../src/services/authService');
const { PasswordResetToken, RefreshToken } = require('../../src/models');
const AppError = require('../../src/utils/AppError');

jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const emailService = require('../../src/services/emailService');

describe('authService unit', () => {
  const basePayload = {
    email: 'traveler@example.com',
    password: 'Sup3r$ecure!',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(() => {
    emailService.sendPasswordResetEmail.mockClear();
  });

  it('registers a user and returns tokens', async () => {
    const result = await authService.register(basePayload, {});

    expect(result.user.email).toBe(basePayload.email);
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });

  it('prevents duplicate registrations for the same email', async () => {
    await authService.register(basePayload, {});

    await expect(authService.register(basePayload, {})).rejects.toThrow(AppError);
  });

  it('creates password reset token and sends placeholder email', async () => {
    const { user } = await authService.register(basePayload, {});

    await authService.requestPasswordReset(basePayload.email, {});

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const call = emailService.sendPasswordResetEmail.mock.calls[0][0];
    expect(call.to).toBe(basePayload.email);
    expect(call.token).toEqual(expect.any(String));
    expect(call.expiresAt).toBeInstanceOf(Date);

    const tokenRecord = await PasswordResetToken.findOne({
      where: { userId: user.id },
    });

    expect(tokenRecord).toBeTruthy();
    expect(tokenRecord.tokenHash).not.toBe(call.token);
    expect(tokenRecord.usedAt).toBeNull();
  });

  it('resets password and revokes existing refresh tokens', async () => {
    const newPassword = 'An0ther$ecure!';

    const { user } = await authService.register(basePayload, {});
    const loginResult = await authService.login(
      { email: basePayload.email, password: basePayload.password },
      {}
    );
    expect(loginResult.tokens.refreshToken).toBeDefined();

    await authService.requestPasswordReset(basePayload.email, {});
    const { token } = emailService.sendPasswordResetEmail.mock.calls[0][0];

    await authService.resetPassword(token, newPassword);

    const tokenRecord = await PasswordResetToken.findOne({
      where: { userId: user.id },
    });

    expect(tokenRecord.usedAt).toBeInstanceOf(Date);

    const activeRefreshTokens = await RefreshToken.count({
      where: {
        userId: user.id,
        revokedAt: null,
      },
    });

    expect(activeRefreshTokens).toBe(0);

    await expect(
      authService.login({ email: basePayload.email, password: basePayload.password }, {})
    ).rejects.toThrow(AppError);

    const newLogin = await authService.login(
      { email: basePayload.email, password: newPassword },
      {}
    );

    expect(newLogin.user.email).toBe(basePayload.email);
  });
});
