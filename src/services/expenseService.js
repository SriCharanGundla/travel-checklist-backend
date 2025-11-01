const { Op } = require('sequelize');
const { Expense } = require('../models');
const AppError = require('../utils/AppError');
const { EXPENSE_CATEGORIES, PERMISSION_LEVELS } = require('../config/constants');
const { ensureTripAccess } = require('./authorizationService');

const CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES);

const normalizeCategory = (value) => {
  if (!value) {
    return EXPENSE_CATEGORIES.OTHER;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!CATEGORY_VALUES.includes(normalized)) {
    throw new AppError('Invalid expense category', 400, 'EXPENSE.INVALID_CATEGORY');
  }

  return normalized;
};

const normalizeAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError('Amount is required', 400, 'EXPENSE.AMOUNT_REQUIRED');
  }

  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    throw new AppError('Amount must be a positive number', 400, 'EXPENSE.INVALID_AMOUNT');
  }

  return Math.round(numeric * 100) / 100;
};

const normalizeCurrency = (value) => {
  if (!value) {
    return 'USD';
  }

  return String(value).trim().toUpperCase().slice(0, 3);
};

const normalizeDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid date for ${fieldName}`, 400, 'EXPENSE.INVALID_DATE');
  }

  return date;
};

const listExpenses = async (userId, tripId, filters = {}) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.VIEW });

  const where = {
    tripId,
  };

  if (filters.category) {
    where.category = normalizeCategory(filters.category);
  }

  if (filters.startDate || filters.endDate) {
    where.spentAt = {};
    if (filters.startDate) {
      where.spentAt[Op.gte] = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.spentAt[Op.lte] = new Date(filters.endDate);
    }
  }

  const expenses = await Expense.findAll({
    where,
    order: [
      ['spentAt', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return expenses.map((expense) => expense.get({ plain: true }));
};

const createExpense = async (userId, tripId, payload) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const expense = await Expense.create({
    tripId,
    category: normalizeCategory(payload.category || EXPENSE_CATEGORIES.OTHER),
    amount: normalizeAmount(payload.amount),
    currency: normalizeCurrency(payload.currency),
    spentAt: normalizeDate(payload.spentAt, 'spentAt'),
    merchant:
      typeof payload.merchant === 'string' && payload.merchant.trim()
        ? payload.merchant.trim()
        : null,
    notes:
      typeof payload.notes === 'string' && payload.notes.trim() ? payload.notes.trim() : null,
    createdBy: userId,
  });

  return expense.get({ plain: true });
};

const updateExpense = async (userId, tripId, expenseId, updates) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const expense = await Expense.findOne({
    where: {
      id: expenseId,
      tripId,
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404, 'EXPENSE.NOT_FOUND');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
    expense.set('category', normalizeCategory(updates.category));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'amount')) {
    expense.set('amount', normalizeAmount(updates.amount));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'currency')) {
    expense.set('currency', normalizeCurrency(updates.currency));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'spentAt')) {
    expense.set('spentAt', normalizeDate(updates.spentAt, 'spentAt'));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'merchant')) {
    expense.set(
      'merchant',
      updates.merchant && typeof updates.merchant === 'string'
        ? updates.merchant.trim() || null
        : null
    );
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    expense.set(
      'notes',
      updates.notes && typeof updates.notes === 'string' ? updates.notes.trim() || null : null
    );
  }

  await expense.save();

  return expense.get({ plain: true });
};

const deleteExpense = async (userId, tripId, expenseId) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const expense = await Expense.findOne({
    where: {
      id: expenseId,
      tripId,
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404, 'EXPENSE.NOT_FOUND');
  }

  await expense.destroy();
};

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
