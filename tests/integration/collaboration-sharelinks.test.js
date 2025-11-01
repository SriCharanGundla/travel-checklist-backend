const authService = require('../../src/services/authService');
const tripService = require('../../src/services/tripService');
const collaboratorService = require('../../src/services/collaboratorService');
const { TripCollaborator } = require('../../src/models');

const context = { ipAddress: '127.0.0.1', userAgent: 'jest-test-suite' };

const registerUser = async (payload) => {
  const { user, tokens } = await authService.register(payload, context);
  return { user, tokens };
};

describe('Collaboration & Share Links Service Integration', () => {
  it('supports collaborator invitations and public share links', async () => {
    const ownerCredentials = {
      email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'OwnerPass!123',
      firstName: 'Olivia',
      lastName: 'Owner',
    };

    const collaboratorCredentials = {
      email: `collaborator-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'CollabPass!123',
      firstName: 'Caleb',
      lastName: 'Collaborator',
    };

    const owner = await registerUser(ownerCredentials);
    const collaborator = await registerUser(collaboratorCredentials);

    const trip = await tripService.createTrip(owner.user.id, {
      name: 'Shared Expedition',
      destination: 'Cusco',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
    });

    const invite = await collaboratorService.inviteCollaborator(owner.user.id, trip.id, {
      email: collaborator.user.email,
      permissionLevel: 'edit',
    });

    expect(invite.collaborator).toMatchObject({
      email: collaborator.user.email,
      status: 'pending',
    });

    const inviteToken = invite.inviteToken;

    await collaboratorService.acceptInvitation({ token: inviteToken, userId: collaborator.user.id });

    const collaboratorRecord = await TripCollaborator.findOne({
      where: { tripId: trip.id, userId: collaborator.user.id },
    });

    expect(collaboratorRecord.status).toBe('accepted');

    const collaboratorTrips = await tripService.listTrips(collaborator.user.id, {});
    expect(collaboratorTrips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: trip.id,
          permission: { level: 'edit', role: 'collaborator' },
        }),
      ])
    );

    const shareLink = await collaboratorService.createShareLink(owner.user.id, trip.id, {
      label: 'Family overview',
      accessLevel: 'view',
      maxUsages: 3,
    });

    expect(shareLink.shareLink).toMatchObject({
      tripId: trip.id,
      accessLevel: 'view',
      label: 'Family overview',
    });

    const publicView = await collaboratorService.publicLookupShareLink({
      token: shareLink.rawToken,
      ipAddress: '127.0.0.1',
      userAgent: 'jest-test-suite',
    });

    expect(publicView).toMatchObject({
      tripId: trip.id,
      accessLevel: 'view',
      trip: expect.objectContaining({
        id: trip.id,
        name: 'Shared Expedition',
        destination: 'Cusco',
      }),
      permissions: { canContribute: false },
      allowedActions: [],
    });

    expect(publicView.itinerary).toEqual([]);
    expect(publicView.expenses).toMatchObject({
      items: [],
      summary: expect.objectContaining({
        currency: 'USD',
        totalSpent: 0,
      }),
    });

    await expect(
      collaboratorService.createShareLink(collaborator.user.id, trip.id, {
        label: 'Should fail',
        accessLevel: 'view',
      })
    ).rejects.toThrow();
  });

  it('allows contribute-level share links to submit limited updates', async () => {
    const ownerCredentials = {
      email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'OwnerPass!123',
      firstName: 'Opal',
      lastName: 'Owner',
    };

    const owner = await registerUser(ownerCredentials);

    const trip = await tripService.createTrip(owner.user.id, {
      name: 'Contribute Trip',
      destination: 'Lisbon',
      startDate: '2026-05-10',
      endDate: '2026-05-18',
      budgetAmount: 1200,
      budgetCurrency: 'EUR',
    });

    const shareLink = await collaboratorService.createShareLink(owner.user.id, trip.id, {
      accessLevel: 'contribute',
      label: 'Friends planning',
    });

    const itineraryAction = await collaboratorService.performShareLinkAction({
      token: shareLink.rawToken,
      action: 'itinerary:add',
      payload: {
        type: 'activity',
        title: 'Sunset sail',
        startTime: '2026-05-12T18:00:00Z',
        endTime: '2026-05-12T20:00:00Z',
        location: 'Tagus River',
      },
      ...context,
    });

    expect(itineraryAction.action).toBe('itinerary:add');
    expect(itineraryAction.itineraryItem).toMatchObject({
      tripId: trip.id,
      title: 'Sunset sail',
      type: 'activity',
    });
    expect(itineraryAction.shareLink.permissions).toEqual({ canContribute: true });
    expect(itineraryAction.shareLink.allowedActions).toEqual(
      expect.arrayContaining(['itinerary:add', 'expense:add'])
    );
    expect(itineraryAction.shareLink.itinerary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Sunset sail',
        }),
      ])
    );

    const expenseAction = await collaboratorService.performShareLinkAction({
      token: shareLink.rawToken,
      action: 'expense:add',
      payload: {
        category: 'food',
        amount: 75.25,
        currency: 'EUR',
        spentAt: '2026-05-12',
        merchant: 'Seafood shack',
        notes: 'Post-sail dinner',
      },
      ...context,
    });

    expect(expenseAction.action).toBe('expense:add');
    expect(expenseAction.expense).toMatchObject({
      tripId: trip.id,
      category: 'food',
      amount: 75.25,
      currency: 'EUR',
    });

    expect(expenseAction.shareLink.expenses.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          merchant: 'Seafood shack',
          amount: 75.25,
        }),
      ])
    );

    expect(expenseAction.shareLink.expenses.summary).toMatchObject({
      currency: 'EUR',
      totalSpent: expect.any(Number),
      budgetAmount: 1200,
    });

    await expect(
      collaboratorService.performShareLinkAction({
        token: shareLink.rawToken,
        action: 'unsupported:action',
        payload: {},
        ...context,
      })
    ).rejects.toThrow();
  });
});
