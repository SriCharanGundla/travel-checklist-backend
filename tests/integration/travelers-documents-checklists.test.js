const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const travelerService = require('../../src/services/travelerService');
const documentService = require('../../src/services/documentService');
const checklistService = require('../../src/services/checklistService');
const travelerDirectoryService = require('../../src/services/travelerDirectoryService');
const { DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS } = require('../../src/config/constants');

const context = { ipAddress: '127.0.0.1', userAgent: 'jest-test-suite' };

const randomEmail = () => `owner-${Math.random().toString(36).slice(2)}@example.com`;

const registerOwner = async () => {
  const credentials = {
    email: randomEmail(),
    password: 'Sup3r$ecure!',
    firstName: 'Jordan',
    lastName: 'Taylor',
  };

  const { user } = await authService.register(credentials, context);
  return user.id;
};

const registerOwnerWithTokens = async () => {
  const credentials = {
    email: randomEmail(),
    password: 'Sup3r$ecure!',
    firstName: 'Jordan',
    lastName: 'Taylor',
  };

  const { user, tokens } = await authService.register(credentials, context);
  return { ownerId: user.id, tokens };
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

  it('allows re-adding a directory traveler after soft deletion', async () => {
    const ownerId = await registerOwner();
    const contact = await travelerDirectoryService.createContact(ownerId, {
      fullName: 'Aditya Vardhan Gundla',
      preferredName: 'Aditya',
      phone: '8106938231',
    });

    const trip = await tripService.createTrip(ownerId, {
      name: 'Directory Sync',
      destination: 'Hyderabad',
    });

    const firstTraveler = await travelerService.createTraveler(ownerId, trip.id, {
      contactId: contact.id,
    });

    await travelerService.deleteTraveler(ownerId, trip.id, firstTraveler.id);

    const secondTraveler = await travelerService.createTraveler(ownerId, trip.id, {
      contactId: contact.id,
    });

    expect(secondTraveler).toBeTruthy();
    expect(secondTraveler.contactId).toBe(contact.id);
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
    expect(document.hasVaultFile).toBe(false);
    expect(document.vaultHost).toBeNull();

    const refreshedTrip = await tripService.getTripById(ownerId, trip.id);
    expect(refreshedTrip.documentsModuleEnabled).toBe(true);

    const documents = await documentService.listDocumentsByTrip(ownerId, trip.id);
    expect(documents).toHaveLength(1);
    expect(documents[0].traveler.fullName).toBe('Morgan Lee');
    expect(documents[0].hasVaultFile).toBe(false);
    expect(documents[0].fileUrl).toBeUndefined();

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

  it('issues secure vault links and resolves sanitized storage URLs', async () => {
    const { ownerId } = await registerOwnerWithTokens();
    const trip = await tripService.createTrip(ownerId, {
      name: 'Vault Validation',
      destination: 'Zurich',
    });

    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Secure Traveler',
      email: 'secure@example.com',
    });

    const document = await documentService.createDocument(ownerId, traveler.id, {
      type: 'passport',
      identifier: 'PASS-1234567',
      issuingCountry: 'US',
      fileUrl: 'https://storage.example.com/secure/docs/passport.pdf?foo=bar#fragment',
    });

    expect(document.hasVaultFile).toBe(true);
    expect(document.vaultHost).toBe('storage.example.com');
    expect(document.vaultFileName).toBe('passport.pdf');

    const fakeRequest = {
      protocol: 'https',
      get: (header) => {
        if (header.toLowerCase() === 'host') {
          return 'api.travel-checklist.test';
        }
        return undefined;
      },
    };

    const { downloadUrl, expiresAt, fileName } = await documentService.generateVaultLink(
      ownerId,
      document.id,
      fakeRequest
    );

    expect(typeof downloadUrl).toBe('string');
    expect(fileName).toBe('passport.pdf');
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const url = new URL(downloadUrl);
    expect(url.origin).toBe('https://api.travel-checklist.test');
    expect(url.pathname).toBe(`/api/v1/documents/${document.id}/vault-download`);
    const token = url.searchParams.get('token');
    const signature = url.searchParams.get('signature');
    expect(token).toBeTruthy();
    expect(signature).toBeTruthy();

    const download = await documentService.resolveVaultDownload({
      documentId: document.id,
      token,
      signature,
    });

    expect(download.vaultReference).toBe('https://storage.example.com/secure/docs/passport.pdf');
    expect(download.metadata.fileName).toBe('passport.pdf');
    expect(download.metadata.host).toBe('storage.example.com');
  });
});
