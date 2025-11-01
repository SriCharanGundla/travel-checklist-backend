const request = require('supertest');
const app = require('../../src/app');

let server;
let api;

const registerUser = async (overrides = {}) => {
  const payload = {
    email: overrides.email || `traveler-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Sup3r$ecure!',
    firstName: 'Casey',
    lastName: 'Jones',
  };

  const { body } = await api.post('/api/v1/auth/register').send(payload);

  return {
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
    user: body.data.user,
  };
};

const createTripPayload = (overrides = {}) => ({
  name: '  Winter Escape  ',
  destination: '  Zurich  ',
  startDate: '2025-12-01',
  endDate: '2025-12-10',
  status: 'planning',
  type: 'leisure',
  budgetCurrency: 'eur',
  budgetAmount: '1234.56',
  description: 'Ski trip with friends',
  notes: 'Remember to book passes',
  ...overrides,
});

describe('Trip API', () => {
  beforeAll(async () => {
    server = await new Promise((resolve, reject) => {
      const listener = app
        .listen(0, '127.0.0.1', () => resolve(listener))
        .on('error', (error) => reject(error));
    });
    api = request.agent(server);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('creates a trip with sanitized values for the authenticated owner', async () => {
    const { accessToken } = await registerUser();

    const response = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createTripPayload({ destination: '   ' }))
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: 'Winter Escape',
      destination: null,
      status: 'planning',
      type: 'leisure',
      budgetCurrency: 'EUR',
    });

    expect(Number(response.body.data.budgetAmount)).toBeCloseTo(1234.56, 2);
  });

  it('rejects trip creation when budget amount is negative', async () => {
    const { accessToken } = await registerUser();

    const response = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createTripPayload({ budgetAmount: '-50.00' }))
      .expect(422);

    expect(response.body.error.message).toBe('Validation failed');
  });

  it('prevents updating a trip with an invalid date range', async () => {
    const { accessToken } = await registerUser();
    const { body } = await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createTripPayload())
      .expect(201);

    const tripId = body.data.id;

    await api
      .put(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ startDate: '2025-12-15', endDate: '2025-12-10' })
      .expect(422);
  });

  it('lists only the trips belonging to the authenticated user', async () => {
    const owner = await registerUser({ email: 'owner@example.com' });
    const otherUser = await registerUser({ email: 'other@example.com' });

    await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(createTripPayload({ name: 'Owner Trip' }))
      .expect(201);

    await api
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .send(createTripPayload({ name: 'Other Trip' }))
      .expect(201);

    const response = await api
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Owner Trip');
  });
});
