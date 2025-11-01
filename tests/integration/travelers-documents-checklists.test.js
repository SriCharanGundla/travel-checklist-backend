const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const travelerService = require('../../src/services/travelerService');
const documentService = require('../../src/services/documentService');
const checklistService = require('../../src/services/checklistService');
const { DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS } = require('../../src/config/constants');

const context = { ipAddress: '127.0.0.1', userAgent: 'jest-test-suite' };

const registerOwner = async () => {
  const credentials = {
    email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Sup3r$ecure!',
    firstName: 'Jordan',
    lastName: 'Taylor',
  };

  const { user } = await authService.register(credentials, context);
  return user.id;
};

describe('Travelers, Documents, and Checklists Service Integration', () => {
  it('manages travelers for a trip', async () => {
    const ownerId = await registerOwner();
    const trip = await tripService.createTrip(ownerId, {
      name: 'Exploration Voyage',
      destination: 'Lisbon',
      startDate: '2026-03-10',
      endDate: '2026-03-20',
    });

    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      phone: '+1 555-100-2000',
      passportCountry: 'CA',
    });

    expect(traveler.fullName).toBe('Alex Rivera');

    const travelers = await travelerService.listTravelers(ownerId, trip.id);
    expect(travelers).toHaveLength(1);
    expect(travelers[0].documents).toEqual([]);

    const updated = await travelerService.updateTraveler(ownerId, trip.id, traveler.id, {
      preferredName: 'Lex',
      emergencyContactName: 'Jamie Rivera',
    });

    expect(updated.preferredName).toBe('Lex');

    await travelerService.deleteTraveler(ownerId, trip.id, traveler.id);

    const afterDelete = await travelerService.listTravelers(ownerId, trip.id);
    expect(afterDelete).toHaveLength(0);
  });

  it('aggregates documents for travelers', async () => {
    const ownerId = await registerOwner();
    const trip = await tripService.createTrip(ownerId, {
      name: 'Documentation Drill',
      destination: 'Tokyo',
    });

    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Morgan Lee',
      email: 'morgan@example.com',
    });

    const document = await documentService.createDocument(ownerId, traveler.id, {
      type: 'visa',
      identifier: 'VIS-9981',
      issuingCountry: 'PT',
      issuedDate: '2025-01-01',
      expiryDate: '2026-01-01',
      status: 'approved',
    });

    expect(document.type).toBe('visa');

    const documents = await documentService.listDocumentsByTrip(ownerId, trip.id);
    expect(documents).toHaveLength(1);
    expect(documents[0].traveler.fullName).toBe('Morgan Lee');

    const updated = await documentService.updateDocument(ownerId, document.id, {
      status: 'expiring_soon',
    });
    expect(updated.status).toBe('expiring_soon');

    await documentService.deleteDocument(ownerId, document.id);

    const afterDelete = await documentService.listDocumentsByTrip(ownerId, trip.id);
    expect(afterDelete).toHaveLength(0);
  });

  it('manages checklist categories and items including completion toggles', async () => {
    const ownerId = await registerOwner();
    const trip = await tripService.createTrip(ownerId, {
      name: 'Checklist Sprint',
      destination: 'Reykjavík',
    });

    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Checklist Owner',
      email: 'owner@example.com',
    });

    const board = await checklistService.getChecklistBoard(ownerId, trip.id);
    expect(board).toHaveLength(DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS.length);

    const category = await checklistService.createCategory(ownerId, trip.id, {
      name: 'Logistics',
      description: 'Transportation tasks',
    });

    const item = await checklistService.createItem(ownerId, category.id, {
      title: 'Book airport transfer',
      priority: 'high',
      assigneeTravelerId: traveler.id,
      dueDate: '2026-02-25',
    });

    expect(item.title).toBe('Book airport transfer');
    expect(item.assigneeTravelerId).toBe(traveler.id);

    const completed = await checklistService.setItemCompletion(ownerId, item.id, true);
    expect(completed.completedAt).not.toBeNull();

    await checklistService.deleteItem(ownerId, item.id);

    const refreshedBoard = await checklistService.getChecklistBoard(ownerId, trip.id);
    const logistics = refreshedBoard.find((column) => column.id === category.id);
    expect(logistics.items).toHaveLength(0);
  });
});
