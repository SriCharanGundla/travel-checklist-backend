const crypto = require('crypto');
const {
  TripCollaborator,
  User,
  Trip,
  ShareLink,
  ShareLinkAudit,
  Expense,
  ItineraryItem,
} = require('../models');
const AppError = require('../utils/AppError');
const {
  PERMISSION_LEVELS,
  COLLABORATOR_STATUS,
  SHARE_LINK_ACCESS_LEVELS,
  EXPENSE_CATEGORIES,
  ITINERARY_TYPES,
} = require('../config/constants');
const { ensureTripAccess, ensureTripOwner, hasSufficientPermission } = require('./authorizationService');
const emailService = require('./emailService');

const INVITE_TOKEN_BYTES = 32;
const INVITE_EXPIRATION_DAYS = 14;

const SHARE_LINK_ACTIONS = {
  ADD_EXPENSE: 'expense:add',
  ADD_ITINERARY_ITEM: 'itinerary:add',
};

const normalizeEmail = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
};

const formatUserDisplayName = (user) => {
  if (!user) {
    return null;
  }

  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) {
    return parts.join(' ');
  }

  return user.email || null;
};

const generateInviteToken = () => {
  const rawToken = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

const buildInviteExpiration = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRATION_DAYS);
  return expiresAt;
};

const listCollaborators = async (userId, tripId, { limit, offset }) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const baseQuery = {
    where: { tripId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
      {
        model: User,
        as: 'inviter',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
    ],
    order: [
      ['status', 'ASC'],
      ['invitedAt', 'DESC'],
    ],
    limit,
    offset,
  };

  let result = await TripCollaborator.findAndCountAll(baseQuery);

  if (result.rows.length === 0 && result.count > 0 && offset >= result.count) {
    const lastPageOffset = Math.floor((result.count - 1) / limit) * limit;
    result = await TripCollaborator.findAndCountAll({ ...baseQuery, offset: lastPageOffset });
  }

  return {
    rows: result.rows.map((entity) => entity.get({ plain: true })),
    count: result.count,
  };
};

const resolveUserByEmail = async (email) => {
  if (!email) {
    return null;
  }

  return User.findOne({
    where: {
      email: normalizeEmail(email),
    },
  });
};

const inviteCollaborator = async (userId, tripId, payload) => {
  const { trip } = await ensureTripAccess(userId, tripId, {
    requiredPermission: PERMISSION_LEVELS.ADMIN,
  });

  const email = normalizeEmail(payload.email);

  if (!email) {
    throw new AppError('Email is required', 400, 'COLLABORATOR.EMAIL_REQUIRED');
  }

  const permissionLevel = Object.values(PERMISSION_LEVELS).includes(payload.permissionLevel)
    ? payload.permissionLevel
    : PERMISSION_LEVELS.EDIT;

  const existing = await TripCollaborator.findOne({
    where: {
      tripId,
      email,
    },
  });

  if (existing) {
    if (existing.status === COLLABORATOR_STATUS.PENDING) {
      throw new AppError('Collaborator already invited', 409, 'COLLABORATOR.ALREADY_INVITED');
    }

    if (existing.status === COLLABORATOR_STATUS.ACCEPTED) {
      throw new AppError('Collaborator already joined trip', 409, 'COLLABORATOR.ALREADY_ACCEPTED');
    }
  }

  const { rawToken, tokenHash } = generateInviteToken();

  const targetUser = await resolveUserByEmail(email);

  if (targetUser) {
    if (targetUser.id === trip.ownerId) {
      throw new AppError('Trip owner already has full access', 400, 'COLLABORATOR.INVITE_OWNER');
    }

    if (targetUser.id === userId) {
      throw new AppError('You already have access to this trip', 400, 'COLLABORATOR.SELF_INVITE');
    }

    const duplicate = await TripCollaborator.findOne({
      where: {
        tripId,
        userId: targetUser.id,
      },
    });

    if (duplicate) {
      throw new AppError('User already invited to trip', 409, 'COLLABORATOR.ALREADY_INVITED');
    }
  }

  const collaborator = await TripCollaborator.create({
    tripId,
    userId: targetUser ? targetUser.id : null,
    inviterId: userId,
    email,
    permissionLevel,
    status: COLLABORATOR_STATUS.PENDING,
    invitationTokenHash: tokenHash,
    expiresAt: buildInviteExpiration(),
  });

  const inviterUser = await User.findByPk(userId);

  await emailService.sendCollaboratorInviteEmail({
    to: email,
    token: rawToken,
    tripName: trip.name,
    permissionLevel,
    inviter: {
      id: inviterUser?.id || null,
      email: inviterUser?.email || null,
      name: formatUserDisplayName(inviterUser),
    },
    expiresAt: collaborator.expiresAt,
  });

  return {
    collaborator: collaborator.get({ plain: true }),
    inviteToken: rawToken,
  };
};

const regenerateInviteToken = async (userId, tripId, collaboratorId) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  const collaborator = await TripCollaborator.findOne({
    where: {
      id: collaboratorId,
      tripId,
    },
  });

  if (!collaborator) {
    throw new AppError('Collaborator not found', 404, 'COLLABORATOR.NOT_FOUND');
  }

  if (collaborator.status === COLLABORATOR_STATUS.ACCEPTED) {
    throw new AppError('Collaborator already accepted invitation', 400, 'COLLABORATOR.ALREADY_ACCEPTED');
  }

  const { rawToken, tokenHash } = generateInviteToken();

  collaborator.set('invitationTokenHash', tokenHash);
  collaborator.set('expiresAt', buildInviteExpiration());
  collaborator.set('inviterId', userId);
  await collaborator.save();

  const inviterUser = await User.findByPk(userId);

  await emailService.sendCollaboratorInviteEmail({
    to: collaborator.email,
    token: rawToken,
    tripName: trip.name,
    permissionLevel: collaborator.permissionLevel,
    inviter: {
      id: inviterUser?.id || null,
      email: inviterUser?.email || null,
      name: formatUserDisplayName(inviterUser),
    },
    expiresAt: collaborator.expiresAt,
    isResend: true,
  });

  return {
    collaborator: collaborator.get({ plain: true }),
    inviteToken: rawToken,
  };
};

const updateCollaboratorPermission = async (userId, tripId, collaboratorId, permissionLevel) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  if (!Object.values(PERMISSION_LEVELS).includes(permissionLevel)) {
    throw new AppError('Invalid permission level', 400, 'COLLABORATOR.INVALID_PERMISSION');
  }

  const collaborator = await TripCollaborator.findOne({
    where: {
      id: collaboratorId,
      tripId,
      status: COLLABORATOR_STATUS.ACCEPTED,
    },
  });

  if (!collaborator) {
    throw new AppError('Collaborator not found or not accepted yet', 404, 'COLLABORATOR.NOT_FOUND');
  }

  collaborator.set('permissionLevel', permissionLevel);
  await collaborator.save();

  return collaborator.get({ plain: true });
};

const removeCollaborator = async (userId, tripId, collaboratorId) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  const collaborator = await TripCollaborator.findOne({
    where: {
      id: collaboratorId,
      tripId,
    },
  });

  if (!collaborator) {
    throw new AppError('Collaborator not found', 404, 'COLLABORATOR.NOT_FOUND');
  }

  if (collaborator.userId === userId) {
    throw new AppError('You cannot remove yourself', 400, 'COLLABORATOR.SELF_REMOVE_FORBIDDEN');
  }

  await collaborator.destroy();
};

const resolveInviteByToken = async (token) => {
  if (!token) {
    throw new AppError('Invitation token is required', 400, 'COLLABORATOR.TOKEN_REQUIRED');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const collaborator = await TripCollaborator.findOne({
    where: {
      invitationTokenHash: tokenHash,
    },
    include: [
      {
        model: Trip,
        as: 'trip',
      },
    ],
  });

  if (!collaborator) {
    throw new AppError('Invalid invitation token', 404, 'COLLABORATOR.INVALID_TOKEN');
  }

  if (collaborator.expiresAt && new Date(collaborator.expiresAt) < new Date()) {
    throw new AppError('Invitation has expired', 410, 'COLLABORATOR.TOKEN_EXPIRED');
  }

  if (collaborator.status !== COLLABORATOR_STATUS.PENDING) {
    throw new AppError('Invitation already used', 400, 'COLLABORATOR.TOKEN_CONSUMED');
  }

  return collaborator;
};

const acceptInvitation = async ({ token, userId }) => {
  if (!userId) {
    throw new AppError('Authenticated user required', 401, 'AUTH.UNAUTHORIZED');
  }

  const collaborator = await resolveInviteByToken(token);

  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'AUTH.USER_NOT_FOUND');
  }

  if (normalizeEmail(user.email) !== collaborator.email) {
    throw new AppError(
      'Invitation email does not match authenticated user',
      400,
      'COLLABORATOR.EMAIL_MISMATCH'
    );
  }

  collaborator.set('status', COLLABORATOR_STATUS.ACCEPTED);
  collaborator.set('respondedAt', new Date());
  collaborator.set('userId', userId);
  collaborator.set('invitationTokenHash', null);
  await collaborator.save();

  return collaborator.get({ plain: true });
};

const declineInvitation = async ({ token, reason }) => {
  const collaborator = await resolveInviteByToken(token);

  collaborator.set('status', COLLABORATOR_STATUS.DECLINED);
  collaborator.set('respondedAt', new Date());
  collaborator.set('invitationTokenHash', null);
  await collaborator.save();

  return collaborator.get({ plain: true });
};

const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES);
const ITINERARY_TYPE_VALUES = Object.values(ITINERARY_TYPES);

const buildShareLinkInclude = (includeTrip = true) => {
  if (!includeTrip) {
    return [];
  }

  return [
    {
      model: Trip,
      as: 'trip',
    },
  ];
};

const getActiveShareLinkByToken = async (
  token,
  { includeTrip = true, incrementUsage = false } = {}
) => {
  if (!token) {
    throw new AppError('Share token required', 400, 'SHARE_LINK.TOKEN_REQUIRED');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const shareLink = await ShareLink.findOne({
    where: {
      tokenHash,
    },
    include: buildShareLinkInclude(includeTrip),
  });

  if (!shareLink) {
    throw new AppError('Share link not found', 404, 'SHARE_LINK.NOT_FOUND');
  }

  if (shareLink.isExpired()) {
    throw new AppError('Share link expired or revoked', 410, 'SHARE_LINK.EXPIRED');
  }

  if (incrementUsage) {
    await shareLink.increment('usageCount');
    await shareLink.reload({ include: buildShareLinkInclude(includeTrip) });
  }

  return shareLink;
};

const sanitizeTripSummary = (tripInstance) => {
  if (!tripInstance) {
    return null;
  }

  const trip = typeof tripInstance.get === 'function' ? tripInstance.get({ plain: true }) : tripInstance;

  const budgetAmount =
    trip.budgetAmount === null || trip.budgetAmount === undefined
      ? 0
      : Number(trip.budgetAmount);

  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
    type: trip.type,
    description: trip.description,
    notes: trip.notes,
    budgetAmount,
    budgetCurrency: trip.budgetCurrency || 'USD',
  };
};

const sanitizeItineraryItem = (itemInstance) => {
  const item = typeof itemInstance.get === 'function' ? itemInstance.get({ plain: true }) : itemInstance;

  return {
    id: item.id,
    tripId: item.tripId,
    type: item.type,
    title: item.title,
    provider: item.provider,
    startTime: item.startTime,
    endTime: item.endTime,
    bookingReference: item.bookingReference,
    location: item.location,
    details: item.details,
    notes: item.notes,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const sanitizeExpense = (expenseInstance) => {
  const expense =
    typeof expenseInstance.get === 'function' ? expenseInstance.get({ plain: true }) : expenseInstance;

  return {
    id: expense.id,
    tripId: expense.tripId,
    category: expense.category,
    amount: Number(expense.amount),
    currency: expense.currency,
    spentAt: expense.spentAt,
    merchant: expense.merchant,
    notes: expense.notes,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
};

const buildExpenseSummary = (expenses, budgetCurrency, budgetAmount) => {
  const totalsByCategory = {};
  let totalSpent = 0;

  expenses.forEach((expense) => {
    const categoryKey = expense.category || EXPENSE_CATEGORIES.OTHER;
    const amount = Number(expense.amount) || 0;
    totalsByCategory[categoryKey] = (totalsByCategory[categoryKey] || 0) + amount;
    totalSpent += amount;
  });

  const budgetTotal = typeof budgetAmount === 'number' ? budgetAmount : Number(budgetAmount || 0);
  const remainingBudget = Number.isFinite(budgetTotal) ? budgetTotal - totalSpent : null;

  return {
    currency: budgetCurrency || 'USD',
    totalSpent,
    budgetAmount: budgetTotal,
    remainingBudget: Number.isFinite(remainingBudget) ? remainingBudget : null,
    totalsByCategory,
  };
};

const buildShareLinkSnapshot = async (shareLink) => {
  const [itineraryRecords, expenseRecords] = await Promise.all([
    ItineraryItem.findAll({
      where: { tripId: shareLink.tripId },
      order: [
        ['startTime', 'ASC'],
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    }),
    Expense.findAll({
      where: { tripId: shareLink.tripId },
      order: [
        ['spentAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    }),
  ]);

  const itinerary = itineraryRecords.map(sanitizeItineraryItem);
  const expenseItems = expenseRecords.map(sanitizeExpense);

  const tripSummary = sanitizeTripSummary(shareLink.trip);
  const expenseSummary = buildExpenseSummary(
    expenseItems,
    tripSummary?.budgetCurrency,
    tripSummary?.budgetAmount
  );

  const allowedActions =
    shareLink.accessLevel === SHARE_LINK_ACCESS_LEVELS.CONTRIBUTE
      ? Object.values(SHARE_LINK_ACTIONS)
      : [];

  return {
    id: shareLink.id,
    tripId: shareLink.tripId,
    accessLevel: shareLink.accessLevel,
    label: shareLink.label,
    expiresAt: shareLink.expiresAt,
    maxUsages: shareLink.maxUsages,
    usageCount: shareLink.usageCount,
    revokedAt: shareLink.revokedAt,
    createdAt: shareLink.createdAt,
    updatedAt: shareLink.updatedAt,
    trip: tripSummary,
    itinerary,
    expenses: {
      items: expenseItems,
      summary: expenseSummary,
    },
    permissions: {
      canContribute: shareLink.accessLevel === SHARE_LINK_ACCESS_LEVELS.CONTRIBUTE,
    },
    allowedActions,
  };
};

const normalizeShareExpensePayload = (payload = {}, defaultCurrency = 'USD') => {
  if (typeof payload !== 'object' || payload === null) {
    throw new AppError('Expense details are required', 400, 'SHARE_LINK.INVALID_PAYLOAD');
  }

  const category = payload.category
    ? String(payload.category).trim().toLowerCase()
    : EXPENSE_CATEGORIES.OTHER;

  if (!EXPENSE_CATEGORY_VALUES.includes(category)) {
    throw new AppError('Invalid expense category', 400, 'SHARE_LINK.INVALID_EXPENSE_CATEGORY');
  }

  const numericAmount = Number.parseFloat(payload.amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new AppError('Amount must be a positive number', 400, 'SHARE_LINK.INVALID_EXPENSE_AMOUNT');
  }

  const currency = (payload.currency || defaultCurrency || 'USD').toString().trim().toUpperCase().slice(0, 3);
  if (!currency) {
    throw new AppError('Currency is required', 400, 'SHARE_LINK.INVALID_EXPENSE_CURRENCY');
  }

  let spentAt = null;
  if (payload.spentAt) {
    const candidate = new Date(payload.spentAt);
    if (Number.isNaN(candidate.getTime())) {
      throw new AppError('Invalid expense date', 400, 'SHARE_LINK.INVALID_EXPENSE_DATE');
    }
    spentAt = candidate;
  }

  const merchant =
    typeof payload.merchant === 'string' && payload.merchant.trim()
      ? payload.merchant.trim().slice(0, 255)
      : null;

  const notes =
    typeof payload.notes === 'string' && payload.notes.trim()
      ? payload.notes.trim().slice(0, 500)
      : null;

  return {
    category,
    amount: Math.round(numericAmount * 100) / 100,
    currency,
    spentAt,
    merchant,
    notes,
  };
};

const normalizeShareItineraryPayload = (payload = {}) => {
  if (typeof payload !== 'object' || payload === null) {
    throw new AppError('Itinerary details are required', 400, 'SHARE_LINK.INVALID_PAYLOAD');
  }

  const type = payload.type
    ? String(payload.type).trim().toLowerCase()
    : ITINERARY_TYPES.ACTIVITY;

  if (!ITINERARY_TYPE_VALUES.includes(type)) {
    throw new AppError('Invalid itinerary item type', 400, 'SHARE_LINK.INVALID_ITINERARY_TYPE');
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    throw new AppError('Itinerary title is required', 400, 'SHARE_LINK.ITINERARY_TITLE_REQUIRED');
  }

  let startTime = null;
  if (payload.startTime) {
    const candidate = new Date(payload.startTime);
    if (Number.isNaN(candidate.getTime())) {
      throw new AppError('Invalid itinerary start time', 400, 'SHARE_LINK.INVALID_ITINERARY_START');
    }
    startTime = candidate;
  }

  let endTime = null;
  if (payload.endTime) {
    const candidate = new Date(payload.endTime);
    if (Number.isNaN(candidate.getTime())) {
      throw new AppError('Invalid itinerary end time', 400, 'SHARE_LINK.INVALID_ITINERARY_END');
    }
    endTime = candidate;
  }

  if (startTime && endTime && startTime > endTime) {
    throw new AppError('End time must be after start time', 400, 'SHARE_LINK.INVALID_ITINERARY_RANGE');
  }

  const provider =
    typeof payload.provider === 'string' && payload.provider.trim()
      ? payload.provider.trim().slice(0, 200)
      : null;

  const bookingReference =
    typeof payload.bookingReference === 'string' && payload.bookingReference.trim()
      ? payload.bookingReference.trim().slice(0, 150)
      : null;

  const location =
    typeof payload.location === 'string' && payload.location.trim()
      ? payload.location.trim().slice(0, 255)
      : null;

  const notes =
    typeof payload.notes === 'string' && payload.notes.trim()
      ? payload.notes.trim().slice(0, 2000)
      : null;

  return {
    type,
    title,
    provider,
    startTime,
    endTime,
    bookingReference,
    location,
    notes,
  };
};

const createExpenseFromShareLink = async (shareLink, payload) => {
  const tripCurrency = shareLink.trip?.budgetCurrency || 'USD';
  const normalized = normalizeShareExpensePayload(payload, tripCurrency);

  const expense = await Expense.create({
    tripId: shareLink.tripId,
    category: normalized.category,
    amount: normalized.amount,
    currency: normalized.currency,
    spentAt: normalized.spentAt,
    merchant: normalized.merchant,
    notes: normalized.notes,
    createdBy: null,
  });

  return sanitizeExpense(expense);
};

const createItineraryItemFromShareLink = async (shareLink, payload) => {
  const normalized = normalizeShareItineraryPayload(payload);

  const itineraryItem = await ItineraryItem.create({
    tripId: shareLink.tripId,
    type: normalized.type,
    title: normalized.title,
    provider: normalized.provider,
    startTime: normalized.startTime,
    endTime: normalized.endTime,
    bookingReference: normalized.bookingReference,
    location: normalized.location,
    details: null,
    notes: normalized.notes,
    sortOrder: 0,
  });

  return sanitizeItineraryItem(itineraryItem);
};

const listShareLinks = async (userId, tripId, { limit, offset }) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  const baseQuery = {
    where: { tripId },
    include: [
      {
        model: ShareLinkAudit,
        as: 'auditLogs',
        attributes: ['id', 'action', 'createdAt'],
        separate: true,
        limit: 5,
        order: [['createdAt', 'DESC']],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  };

  let result = await ShareLink.findAndCountAll(baseQuery);

  if (result.rows.length === 0 && result.count > 0 && offset >= result.count) {
    const lastPageOffset = Math.floor((result.count - 1) / limit) * limit;
    result = await ShareLink.findAndCountAll({ ...baseQuery, offset: lastPageOffset });
  }

  return {
    rows: result.rows.map((record) => record.get({ plain: true })),
    count: result.count,
  };
};

const createShareLink = async (userId, tripId, payload) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  const accessLevel = Object.values(SHARE_LINK_ACCESS_LEVELS).includes(payload.accessLevel)
    ? payload.accessLevel
    : SHARE_LINK_ACCESS_LEVELS.VIEW;

  const { rawToken, tokenHash } = generateInviteToken();

  const shareLink = await ShareLink.create({
    tripId,
    createdBy: userId,
    label: payload.label ? payload.label.trim() : null,
    tokenHash,
    accessLevel,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    maxUsages:
      payload.maxUsages === undefined || payload.maxUsages === null
        ? null
        : Number(payload.maxUsages),
  });

  await ShareLinkAudit.create({
    shareLinkId: shareLink.id,
    tripId,
    action: 'created',
    performedBy: userId,
  });

  return {
    shareLink: shareLink.get({ plain: true }),
    rawToken,
  };
};

const revokeShareLink = async (userId, tripId, shareLinkId) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.ADMIN });

  const shareLink = await ShareLink.findOne({
    where: {
      id: shareLinkId,
      tripId,
    },
  });

  if (!shareLink) {
    throw new AppError('Share link not found', 404, 'SHARE_LINK.NOT_FOUND');
  }

  shareLink.set('revokedAt', new Date());
  await shareLink.save();

  await ShareLinkAudit.create({
    shareLinkId: shareLink.id,
    tripId,
    action: 'revoked',
    performedBy: userId,
  });
};

const publicLookupShareLink = async ({ token, userAgent, ipAddress }) => {
  const shareLink = await getActiveShareLinkByToken(token, {
    includeTrip: true,
    incrementUsage: true,
  });

  await ShareLinkAudit.create({
    shareLinkId: shareLink.id,
    tripId: shareLink.tripId,
    action: 'accessed',
    ipAddress,
    userAgent,
  });

  return buildShareLinkSnapshot(shareLink);
};

const performShareLinkAction = async ({ token, action, payload = {}, userAgent, ipAddress }) => {
  const shareLink = await getActiveShareLinkByToken(token, { includeTrip: true });

  if (shareLink.accessLevel !== SHARE_LINK_ACCESS_LEVELS.CONTRIBUTE) {
    throw new AppError('This share link is read-only', 403, 'SHARE_LINK.READ_ONLY');
  }

  let responseData;

  switch (action) {
    case SHARE_LINK_ACTIONS.ADD_EXPENSE: {
      const expense = await createExpenseFromShareLink(shareLink, payload);
      responseData = { expense };
      break;
    }
    case SHARE_LINK_ACTIONS.ADD_ITINERARY_ITEM: {
      const itineraryItem = await createItineraryItemFromShareLink(shareLink, payload);
      responseData = { itineraryItem };
      break;
    }
    default:
      throw new AppError('Unsupported share link action', 400, 'SHARE_LINK.INVALID_ACTION');
  }

  await ShareLinkAudit.create({
    shareLinkId: shareLink.id,
    tripId: shareLink.tripId,
    action: `share_action:${action}`,
    ipAddress,
    userAgent,
  });

  shareLink.set('updatedAt', new Date());
  await shareLink.save();
  await shareLink.reload({ include: buildShareLinkInclude(true) });

  const snapshot = await buildShareLinkSnapshot(shareLink);

  return {
    action,
    shareLink: snapshot,
    ...responseData,
  };
};

module.exports = {
  listCollaborators,
  inviteCollaborator,
  regenerateInviteToken,
  updateCollaboratorPermission,
  removeCollaborator,
  acceptInvitation,
  declineInvitation,
  listShareLinks,
  createShareLink,
  revokeShareLink,
  publicLookupShareLink,
  performShareLinkAction,
};
