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
    expect(trip.documentsModuleEnabled).toBe(false);
    expect(trip.permission).toEqual({ role: 'owner', level: 'admin' });
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
    expect(trips[0].permission.level).toBe('admin');
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

  it('updates the documents module flag independently', async () => {
    const trip = await tripService.createTrip(ownerId, {
      name: 'Toggle Docs',
    });

    const updated = await tripService.updateTrip(ownerId, trip.id, {
      documentsModuleEnabled: true,
    });

    expect(updated.documentsModuleEnabled).toBe(true);
  });
});

describe('tripService collaborator access', () => {
  it('allows accepted collaborators to list and access trips with permissions', async () => {
    const ownerRegistration = await authService.register(
      { email: 'collab-owner@example.com', password: 'OwnerPass!123' },
      {}
    );
    const collaboratorRegistration = await authService.register(
      { email: 'teammate@example.com', password: 'TeammatePass!123' },
      {}
    );

    const trip = await tripService.createTrip(ownerRegistration.user.id, {
      name: 'Shared Expedition',
      destination: 'Peru',
    });

    const { TripCollaborator } = require('../../src/models');

    await TripCollaborator.create({
      tripId: trip.id,
      userId: collaboratorRegistration.user.id,
      inviterId: ownerRegistration.user.id,
      email: collaboratorRegistration.user.email,
      permissionLevel: 'edit',
      status: 'accepted',
    });

    const collaboratorTrips = await tripService.listTrips(collaboratorRegistration.user.id, {});
    expect(collaboratorTrips).toHaveLength(1);
    expect(collaboratorTrips[0].permission).toEqual({ role: 'collaborator', level: 'edit' });

    const tripDetail = await tripService.getTripById(collaboratorRegistration.user.id, trip.id);
    expect(tripDetail.permission.level).toBe('edit');
    expect(tripDetail.permission.role).toBe('collaborator');
  });
});
