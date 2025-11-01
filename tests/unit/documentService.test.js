const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const travelerService = require('../../src/services/travelerService');
const documentService = require('../../src/services/documentService');
const AppError = require('../../src/utils/AppError');

describe('documentService', () => {
  let ownerId;
  let trip;
  let traveler;

  beforeEach(async () => {
    const registration = await authService.register(
      {
        email: 'document-owner@example.com',
        password: 'Str0ngP@ssw0rd',
      },
      {}
    );

    ownerId = registration.user.id;
    trip = await tripService.createTrip(ownerId, {
      name: 'Document Trip',
    });

    traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Dana Documented',
    });
  });

  it('creates and lists documents for a trip', async () => {
    const document = await documentService.createDocument(ownerId, traveler.id, {
      type: 'passport',
      identifier: 'PP123456',
      expiryDate: '2028-05-01',
    });

    expect(document.type).toBe('passport');
    expect(document.identifier).toBe('PP123456');

    const documents = await documentService.listDocumentsByTrip(ownerId, trip.id);
    expect(documents).toHaveLength(1);
    expect(documents[0].traveler.fullName).toBe('Dana Documented');
  });

  it('updates document status', async () => {
    const document = await documentService.createDocument(ownerId, traveler.id, {
      type: 'visa',
    });

    const updated = await documentService.updateDocument(ownerId, document.id, {
      status: 'approved',
    });

    expect(updated.status).toBe('approved');
  });

  it('enforces document ownership by trip owner', async () => {
    const otherRegistration = await authService.register(
      {
        email: 'other-doc-owner@example.com',
        password: 'An0therP@ss',
      },
      {}
    );

    const otherTrip = await tripService.createTrip(otherRegistration.user.id, {
      name: 'Other Doc Trip',
    });

    const otherTraveler = await travelerService.createTraveler(
      otherRegistration.user.id,
      otherTrip.id,
      {
        fullName: 'Evan Elsewhere',
      }
    );

    const otherDocument = await documentService.createDocument(
      otherRegistration.user.id,
      otherTraveler.id,
      {
        type: 'insurance',
      }
    );

    await expect(documentService.updateDocument(ownerId, otherDocument.id, { status: 'valid' })).rejects.toThrow(
      AppError
    );
  });
});

