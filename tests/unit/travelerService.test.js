const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const travelerService = require('../../src/services/travelerService');
const AppError = require('../../src/utils/AppError');

describe('travelerService', () => {
  let ownerId;
  let trip;

  beforeEach(async () => {
    const registration = await authService.register(
      {
        email: 'traveler-owner@example.com',
        password: 'Str0ngP@ss!',
      },
      {}
    );

    ownerId = registration.user.id;
    trip = await tripService.createTrip(ownerId, {
      name: 'Traveler Trip',
      destination: 'Lisbon',
    });
  });

  it('creates and lists travelers for a trip', async () => {
    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Alice Adventurer',
      email: 'alice@example.com',
      passportNumber: 'X1234567',
    });

    expect(traveler.fullName).toBe('Alice Adventurer');
    expect(traveler.passportNumber).toBe('X1234567');

    const travelers = await travelerService.listTravelers(ownerId, trip.id);
    expect(travelers).toHaveLength(1);
    expect(travelers[0].fullName).toBe('Alice Adventurer');
  });

  it('updates traveler details', async () => {
    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Bob Backpacker',
    });

    const updated = await travelerService.updateTraveler(ownerId, trip.id, traveler.id, {
      preferredName: 'Bobby',
      passportExpiry: '2026-12-31',
    });

    expect(updated.preferredName).toBe('Bobby');
    expect(updated.passportExpiry).toBe('2026-12-31');
  });

  it('prevents deleting a traveler from another trip', async () => {
    const otherRegistration = await authService.register(
      {
        email: 'other-owner@example.com',
        password: 'Str0ngP@ss!2',
      },
      {}
    );

    const otherTrip = await tripService.createTrip(otherRegistration.user.id, {
      name: 'Other Trip',
    });

    const otherTraveler = await travelerService.createTraveler(
      otherRegistration.user.id,
      otherTrip.id,
      {
        fullName: 'Charlie Companion',
      }
    );

    await expect(
      travelerService.deleteTraveler(ownerId, trip.id, otherTraveler.id)
    ).rejects.toThrow(AppError);
  });
});

