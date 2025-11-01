const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const AppError = require('../../src/utils/AppError');

describe('tripService unit', () => {
  const userPayload = {
    email: 'owner@example.com',
    password: 'Sup3r$ecure!',
  };

  let ownerId;

  beforeEach(async () => {
    const registration = await authService.register(userPayload, {});
    ownerId = registration.user.id;
  });

  it('creates a trip with normalized values', async () => {
    const trip = await tripService.createTrip(ownerId, {
      name: ' Summer Escape ',
      destination: 'Lisbon',
      startDate: '2025-12-01',
      endDate: '2025-12-10',
      budgetAmount: '1200.505',
      budgetCurrency: 'eur',
      status: 'confirmed',
    });

    expect(trip.name).toBe('Summer Escape');
    expect(trip.destination).toBe('Lisbon');
    expect(trip.status).toBe('confirmed');
    expect(trip.type).toBe('leisure');
    expect(Number(trip.budgetAmount)).toBeCloseTo(1200.51);
    expect(trip.budgetCurrency).toBe('EUR');
  });

  it('rejects trips with invalid date ranges', async () => {
    await expect(
      tripService.createTrip(ownerId, {
        name: 'Invalid Dates',
        startDate: '2025-05-20',
        endDate: '2025-05-10',
      })
    ).rejects.toThrow(AppError);
  });

  it('lists trips filtered by search term', async () => {
    await tripService.createTrip(ownerId, {
      name: 'Japan Adventure',
      destination: 'Tokyo',
    });

    await tripService.createTrip(ownerId, {
      name: 'Mountain Retreat',
      destination: 'Zurich',
    });

    const trips = await tripService.listTrips(ownerId, { search: 'Japan' });
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe('Japan Adventure');
  });

  it('prevents updates that produce invalid date ranges', async () => {
    const trip = await tripService.createTrip(ownerId, {
      name: 'Test Trip',
      startDate: '2025-06-01',
      endDate: '2025-06-10',
    });

    await expect(
      tripService.updateTrip(ownerId, trip.id, {
        startDate: '2025-07-01',
        endDate: '2025-06-15',
      })
    ).rejects.toThrow(AppError);
  });
});

