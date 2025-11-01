const request = require('supertest');
const app = require('../../src/app');
const { RefreshToken } = require('../../src/models');

const buildUserPayload = (overrides = {}) => ({
  email: 'Traveler@example.com',
  password: 'Sup3r$ecure!',
  firstName: '  Ada  ',
  lastName: 'Lovelace',
  timezone: 'Europe/London',
  ...overrides,
});

describe('Auth API', () => {
  it('registers a new user and normalizes profile fields', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(buildUserPayload());

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: 'traveler@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      timezone: 'Europe/London',
    });
    expect(response.body.data.tokens).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        refreshTokenExpiresAt: expect.any(String),
      })
    );
  });

  it('rejects weak passwords with a validation error', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(buildUserPayload({ password: 'password' }));

    expect(response.status).toBe(422);
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('logs in an existing user and enforces credential checks', async () => {
    const credentials = buildUserPayload();
    await request(app).post('/api/v1/auth/register').send(credentials).expect(201);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email.toUpperCase(), password: credentials.password })
      .expect(200);

    expect(loginResponse.body.data.user.email).toBe('traveler@example.com');
    expect(loginResponse.body.data.tokens.accessToken).toEqual(expect.any(String));

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass1!' })
      .expect(401);
  });

  it('rotates refresh tokens and revokes the previous token', async () => {
    const { body } = await request(app).post('/api/v1/auth/register').send(buildUserPayload());
    const originalRefreshToken = body.data.tokens.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(200);

    expect(refreshResponse.body.data.tokens.refreshToken).not.toBe(originalRefreshToken);

    const refreshTokens = await RefreshToken.findAll({ order: [['createdAt', 'ASC']] });
    expect(refreshTokens).toHaveLength(2);
    expect(refreshTokens[0].revokedAt).not.toBeNull();
  });
});
