#!/usr/bin/env node

/* eslint-disable no-console */
require('dotenv').config();

const { Op } = require('sequelize');
const { sequelize, Traveler, Document } = require('../src/models');
const documentVaultService = require('../src/services/documentVaultService');

const BATCH_SIZE = Number.parseInt(process.env.BACKFILL_BATCH_SIZE, 10) || 100;

const fieldsToBackfill = {
  Traveler: ['email', 'phone', 'passportNumber', 'emergencyContactName', 'emergencyContactPhone', 'notes'],
  Document: ['identifier', 'notes', 'fileUrl'],
};

const getNotLikeOperator = () => {
  if (Op.notILike) {
    return Op.notILike;
  }
  return Op.notLike;
};

const buildWhereClause = (fieldNames) => {
  const notLikeOp = getNotLikeOperator();
  const clauses = fieldNames.map((field) => ({
    [field]: {
      [Op.and]: [{ [Op.ne]: null }, { [notLikeOp]: 'ENC.v1:%' }],
    },
  }));
  return { [Op.or]: clauses };
};

const reencryptRecord = async (instance, fieldNames) => {
  let changed = false;

  fieldNames.forEach((field) => {
    const value = instance.get(field);
    if (typeof value !== 'string' || !value) {
      return;
    }

    if (value.startsWith('ENC.v1:')) {
      return;
    }

    if (field === 'fileUrl') {
      try {
        const normalized = documentVaultService.normalizeVaultReference(value);
        if (normalized === undefined || normalized === null) {
          instance.set(field, null);
        } else {
          instance.set(field, normalized);
        }
      } catch (error) {
        console.warn(
          `[backfill] Skipping insecure vault reference for record ${instance.id}: ${error.message}`
        );
        instance.set(field, null);
      }
    } else {
      instance.set(field, value);
    }
    changed = changed || instance.changed(field);
  });

  if (changed) {
    await instance.save({ silent: true });
  }

  return changed;
};

const backfillModel = async (Model, modelName, fieldList) => {
  const where = buildWhereClause(fieldList);
  let totalUpdated = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const records = await Model.unscoped().findAll({
      where,
      limit: BATCH_SIZE,
      order: [['createdAt', 'ASC']],
    });

    if (!records.length) {
      break;
    }

    // process sequentially to reduce connection churn
    // eslint-disable-next-line no-restricted-syntax
    for (const record of records) {
      // If encryption utilities changed format, allow forcing re-encryption via env
      const forced = process.env.FORCE_SENSITIVE_BACKFILL === 'true';
      if (forced) {
        fieldList.forEach((field) => {
          const decrypted = record.get(field);
          if (decrypted === undefined) {
            return;
          }

          if (decrypted === null) {
            record.set(field, null);
            return;
          }

          if (field === 'fileUrl') {
            try {
              const normalized = documentVaultService.normalizeVaultReference(decrypted);
              record.set(field, normalized === undefined ? null : normalized);
            } catch (error) {
              console.warn(
                `[backfill] Skipping insecure vault reference for record ${record.id}: ${error.message}`
              );
              record.set(field, null);
            }
          } else {
            record.set(field, decrypted);
          }
        });
        await record.save({ silent: true });
        totalUpdated += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      const updated = await reencryptRecord(record, fieldList);
      if (updated) {
        totalUpdated += 1;
      }
    }

  }

  if (totalUpdated > 0) {
    console.log(`[backfill] ${modelName}: re-encrypted ${totalUpdated} record(s)`);
  } else {
    console.log(`[backfill] ${modelName}: no plaintext records found`);
  }
};

const run = async () => {
  console.log('[backfill] Starting sensitive data backfill process');

  try {
    await sequelize.authenticate();

    await backfillModel(Traveler, 'Traveler', fieldsToBackfill.Traveler);
    await backfillModel(Document, 'Document', fieldsToBackfill.Document);

    console.log('[backfill] Completed sensitive data backfill');
    process.exit(0);
  } catch (error) {
    console.error('[backfill] Failed to backfill sensitive data', error);
    process.exit(1);
  }
};

run();
