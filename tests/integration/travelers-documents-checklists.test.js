const request = require('supertest');
const app = require('../../src/app');
const { DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS } = require('../../src/config/constants');

let server;
let api;

const registerUser = async (overrides = {}) => {
  const payload = {
    email: overrides.email || `owner-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Sup3r$ecure!',
    firstName: 'Jordan',
    lastName: 'Taylor',
  };

  const { body } = await api.post('/api/v1/auth/register').send(payload);

  return {
    accessToken: body.data.tokens.accessToken,
    user: body.data.user,
  };
};

const createTrip = async (token, overrides = {}) => {
  const payload = {
    name: 'Exploration Voyage',
    destination: 'Lisbon',
    startDate: '2026-03-10',
    endDate: '2026-03-20',
    budgetCurrency: 'USD',
    budgetAmount: '2500.00',
    description: 'Team retreat with multiple excursions',
    ...overrides,
  };

  const { body } = await api
    .post('/api/v1/trips')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  return body.data;
};

const createTraveler = async (token, tripId, overrides = {}) => {
  const payload = {
    fullName: 'Morgan Lee',
    email: 'morgan@example.com',
    passportNumber: 'X1234567',
    passportCountry: 'US',
    passportExpiry: '2027-05-01',
    ...overrides,
  };

  const { body } = await api
    .post(`/api/v1/trips/${tripId}/travelers`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  return body.data;
};

describe('Travelers, Documents, and Checklists API', () => {
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

  it('manages travelers for a trip', async () => {
    const { accessToken } = await registerUser();
    const trip = await createTrip(accessToken);

    const createResponse = await api
      .post(`/api/v1/trips/${trip.id}/travelers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Alex Rivera',
        email: 'alex@example.com',
        phone: '+1 555-100-2000',
        passportCountry: 'CA',
      })
      .expect(201);

    expect(createResponse.body.data.fullName).toBe('Alex Rivera');
    const travelerId = createResponse.body.data.id;

    const listResponse = await api
      .get(`/api/v1/trips/${trip.id}/travelers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].documents).toEqual([]);

    const updateResponse = await api
      .patch(`/api/v1/trips/${trip.id}/travelers/${travelerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        preferredName: 'Lex',
        emergencyContactName: 'Jamie Rivera',
      })
      .expect(200);

    expect(updateResponse.body.data.preferredName).toBe('Lex');
    expect(updateResponse.body.data.emergencyContactName).toBe('Jamie Rivera');

    await api
      .delete(`/api/v1/trips/${trip.id}/travelers/${travelerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const afterDelete = await api
      .get(`/api/v1/trips/${trip.id}/travelers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(afterDelete.body.data).toHaveLength(0);
  });

  it('aggregates documents for travelers', async () => {
    const { accessToken } = await registerUser();
    const trip = await createTrip(accessToken);
    const traveler = await createTraveler(accessToken, trip.id);

    const createDocResponse = await api
      .post(`/api/v1/travelers/${traveler.id}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'visa',
        identifier: 'VIS-9981',
        issuingCountry: 'PT',
        issuedDate: '2025-01-01',
        expiryDate: '2026-01-01',
        status: 'approved',
      })
      .expect(201);

    expect(createDocResponse.body.data.type).toBe('visa');
    const documentId = createDocResponse.body.data.id;

    const listDocsResponse = await api
      .get(`/api/v1/trips/${trip.id}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listDocsResponse.body.data).toHaveLength(1);
    expect(listDocsResponse.body.data[0].traveler.fullName).toBe(traveler.fullName);

    const updateDocResponse = await api
      .patch(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'expiring_soon' })
      .expect(200);

    expect(updateDocResponse.body.data.status).toBe('expiring_soon');

    await api
      .delete(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const docsAfterDelete = await api
      .get(`/api/v1/trips/${trip.id}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(docsAfterDelete.body.data).toHaveLength(0);
  });

  it('manages checklist categories and items including completion toggles', async () => {
    const { accessToken } = await registerUser();
    const trip = await createTrip(accessToken);
    const traveler = await createTraveler(accessToken, trip.id, {
      fullName: 'Checklist Owner',
    });

    const boardResponse = await api
      .get(`/api/v1/trips/${trip.id}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(boardResponse.body.data).toHaveLength(DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS.length);

    const newCategoryResponse = await api
      .post(`/api/v1/trips/${trip.id}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Logistics',
        description: 'Transportation and lodging tasks',
      })
      .expect(201);

    expect(newCategoryResponse.body.data.name).toBe('Logistics');
    const categoryId = newCategoryResponse.body.data.id;

    const createItemResponse = await api
      .post(`/api/v1/checklists/categories/${categoryId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Book flights',
        priority: 'high',
        dueDate: '2025-12-01',
        assigneeTravelerId: traveler.id,
        notes: 'Use corporate portal for discounts',
      })
      .expect(201);

    expect(createItemResponse.body.data.priority).toBe('high');
    const itemId = createItemResponse.body.data.id;

    const completionResponse = await api
      .post(`/api/v1/checklists/items/${itemId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ completed: true })
      .expect(200);

    expect(completionResponse.body.data.completedAt).not.toBeNull();

    await api
      .delete(`/api/v1/checklists/items/${itemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const finalBoardResponse = await api
      .get(`/api/v1/trips/${trip.id}/checklists`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const logisticsCategory = finalBoardResponse.body.data.find(
      (category) => category.id === categoryId
    );

    expect(logisticsCategory.items).toHaveLength(0);
  });
});

