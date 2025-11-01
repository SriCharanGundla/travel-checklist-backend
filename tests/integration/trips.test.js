const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const expenseService = require('../../src/services/expenseService');
const { exportTripData } = require('../../src/services/exportService');
const AppError = require('../../src/utils/AppError');

const context = { ipAddress: '127.0.0.1', userAgent: 'jest-test-suite' };

const registerUser = async (overrides = {}) => {
  const payload = {
    email: overrides.email || `traveler-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Sup3r$ecure!',
    firstName: 'Casey',
    lastName: 'Jones',
  };

  const { user } = await authService.register(payload, context);
  return user.id;
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

describe('Trip Service Integration', () => {
  it('creates a trip with sanitized values for the authenticated owner', async () => {
    const ownerId = await registerUser();

    const trip = await tripService.createTrip(ownerId, createTripPayload({ destination: '   ' }));

    expect(trip).toMatchObject({
      name: 'Winter Escape',
      destination: null,
      status: 'planning',
      type: 'leisure',
      budgetCurrency: 'EUR',
      permission: { role: 'owner', level: 'admin' },
    });
    expect(Number(trip.budgetAmount)).toBeCloseTo(1234.56, 2);
  });

  it('rejects trip creation when budget amount is negative', async () => {
    const ownerId = await registerUser();

    await expect(
      tripService.createTrip(ownerId, createTripPayload({ budgetAmount: '-50.00' }))
    ).rejects.toThrow(AppError);
  });

  it('prevents updating a trip with an invalid date range', async () => {
    const ownerId = await registerUser();
    const trip = await tripService.createTrip(ownerId, createTripPayload());

    await expect(
      tripService.updateTrip(ownerId, trip.id, {
        startDate: '2025-12-15',
        endDate: '2025-12-10',
      })
    ).rejects.toThrow(AppError);
  });

  it('lists only the trips belonging to the authenticated user', async () => {
    const ownerId = await registerUser({ email: 'owner@example.com' });
    const otherId = await registerUser({ email: 'other@example.com' });

    await tripService.createTrip(ownerId, createTripPayload({ name: 'Owner Trip' }));
    await tripService.createTrip(otherId, createTripPayload({ name: 'Other Trip' }));

    const trips = await tripService.listTrips(ownerId, {});
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe('Owner Trip');
  });

  it('exports trip and budget data in requested formats', async () => {
    const ownerId = await registerUser({ email: 'exporter@example.com' });
    const trip = await tripService.createTrip(
      ownerId,
      createTripPayload({ name: 'Export Trip', budgetAmount: '1500.00', budgetCurrency: 'usd' })
    );

    await expenseService.createExpense(ownerId, trip.id, {
      category: 'food',
      amount: 120.5,
      currency: 'USD',
      merchant: 'Cafe Central',
      notes: 'Team brunch',
    });

    const pdfExport = await exportTripData(ownerId, trip.id, { resource: 'trip', format: 'pdf' });
    expect(pdfExport.contentType).toBe('application/pdf');
    expect(pdfExport.buffer.length).toBeGreaterThan(500);
    expect(pdfExport.filename).toMatch(/export-trip-trip/);

    const csvExport = await exportTripData(ownerId, trip.id, { resource: 'budget', format: 'csv' });
    expect(csvExport.contentType).toBe('text/csv');
    const csvString = csvExport.buffer.toString('utf-8');
    expect(csvString).toContain('Expenses');
    expect(csvString).toContain('Cafe Central');
  });
});
