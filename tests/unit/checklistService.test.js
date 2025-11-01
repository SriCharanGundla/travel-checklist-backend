const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const checklistService = require('../../src/services/checklistService');
const travelerService = require('../../src/services/travelerService');
const { DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS } = require('../../src/config/constants');

describe('checklistService', () => {
  let ownerId;
  let trip;

  beforeEach(async () => {
    const registration = await authService.register(
      {
        email: 'checklist-owner@example.com',
        password: 'Sup3rP@ssword!',
      },
      {}
    );

    ownerId = registration.user.id;
    trip = await tripService.createTrip(ownerId, {
      name: 'Checklist Trip',
    });
  });

  it('returns seeded checklist categories for a trip', async () => {
    const board = await checklistService.getChecklistBoard(ownerId, trip.id);
    expect(board).toHaveLength(DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS.length);

    const slugs = board.map((category) => category.slug);
    DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS.forEach((definition) => {
      expect(slugs).toContain(definition.slug);
    });
  });

  it('creates and updates checklist items', async () => {
    const board = await checklistService.getChecklistBoard(ownerId, trip.id);
    const category = board[0];

    const traveler = await travelerService.createTraveler(ownerId, trip.id, {
      fullName: 'Checklist Assignee',
    });

    const item = await checklistService.createItem(ownerId, category.id, {
      title: 'Apply for visa',
      priority: 'high',
      assigneeTravelerId: traveler.id,
    });

    expect(item.title).toBe('Apply for visa');
    expect(item.priority).toBe('high');
    expect(item.assigneeTravelerId).toBe(traveler.id);

    const updated = await checklistService.updateItem(ownerId, item.id, {
      notes: 'Expedite processing',
      completed: true,
    });

    expect(updated.notes).toBe('Expedite processing');
    expect(updated.completedAt).not.toBeNull();

    const reverted = await checklistService.setItemCompletion(ownerId, item.id, false);
    expect(reverted.completedAt).toBeNull();
  });
});

