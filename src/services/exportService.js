const PDFDocument = require('pdfkit');
const {
  Trip,
  Traveler,
  Document,
  ChecklistCategory,
  ChecklistItem,
  Expense,
  ItineraryItem,
} = require('../models');
const { ensureTripAccess } = require('./authorizationService');
const { PERMISSION_LEVELS } = require('../config/constants');
const AppError = require('../utils/AppError');
const slugify = require('../utils/slugify');

const EXPORT_RESOURCES = {
  TRIP: 'trip',
  BUDGET: 'budget',
};

const EXPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
};

const normalizeFormat = (value) => {
  const lower = String(value || '').toLowerCase();
  return Object.values(EXPORT_FORMATS).includes(lower) ? lower : EXPORT_FORMATS.PDF;
};

const normalizeResource = (value) => {
  const lower = String(value || '').toLowerCase();
  return Object.values(EXPORT_RESOURCES).includes(lower) ? lower : EXPORT_RESOURCES.TRIP;
};

const fetchTripWithAssociations = async (tripId) => {
  const trip = await Trip.findByPk(tripId, {
    include: [
      {
        model: Traveler,
        as: 'travelers',
        include: [
          {
            model: Document,
            as: 'documents',
            attributes: [
              'id',
              'type',
              'identifier',
              'issuingCountry',
              'issuedDate',
              'expiryDate',
              'status',
            ],
          },
        ],
      },
      {
        model: ChecklistCategory,
        as: 'checklistCategories',
        include: [
          {
            model: ChecklistItem,
            as: 'items',
            include: [
              {
                model: Traveler,
                as: 'assignee',
                attributes: ['id', 'fullName'],
              },
            ],
          },
        ],
      },
      {
        model: Expense,
        as: 'expenses',
      },
      {
        model: ItineraryItem,
        as: 'itineraryItems',
      },
    ],
    order: [
      [{ model: Traveler, as: 'travelers' }, 'fullName', 'ASC'],
      [{ model: ChecklistCategory, as: 'checklistCategories' }, 'sortOrder', 'ASC'],
      [{ model: ChecklistCategory, as: 'checklistCategories' }, { model: ChecklistItem, as: 'items' }, 'sortOrder', 'ASC'],
      [{ model: ItineraryItem, as: 'itineraryItems' }, 'startTime', 'ASC'],
    ],
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  return trip.get({ plain: true });
};

const createPdfBuffer = (build) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));
    build(doc);
    doc.end();
  });

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
};

const summarizeChecklist = (categories = []) =>
  categories.map((category) => {
    const total = category.items?.length || 0;
    const completed = category.items?.filter((item) => item.completedAt).length || 0;
    const pending = total - completed;

    return {
      name: category.name,
      total,
      completed,
      pending,
    };
  });

const buildTripPdf = async (trip) =>
  createPdfBuffer((doc) => {
    doc.fontSize(20).text(trip.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Destination: ${trip.destination || 'TBD'}`);
    doc.text(`Dates: ${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}`);
    doc.text(`Status: ${trip.status}`);
    doc.text(`Trip type: ${trip.type}`);
    doc.text(`Budget: ${trip.budgetCurrency || 'USD'} ${Number(trip.budgetAmount || 0).toLocaleString()}`);

    if (trip.description) {
      doc.moveDown(0.75);
      doc.fontSize(14).text('Description', { underline: true });
      doc.fontSize(12).text(trip.description, { lineGap: 4 });
    }

    if (trip.notes) {
      doc.moveDown(0.75);
      doc.fontSize(14).text('Notes', { underline: true });
      doc.fontSize(12).text(trip.notes, { lineGap: 4 });
    }

    if (trip.travelers?.length) {
      doc.addPage();
      doc.fontSize(16).text('Travelers', { underline: true });
      doc.moveDown(0.5);
      trip.travelers.forEach((traveler) => {
        doc.fontSize(12).font('Helvetica-Bold').text(traveler.fullName);
        doc.font('Helvetica');
        if (traveler.preferredName) {
          doc.fontSize(11).font('Helvetica-Oblique').text(`Preferred name: ${traveler.preferredName}`);
          doc.font('Helvetica');
        }
        if (traveler.email) {
          doc.text(`Email: ${traveler.email}`);
        }
        if (traveler.phone) {
          doc.text(`Phone: ${traveler.phone}`);
        }
        if (traveler.passportNumber) {
          doc.text(
            `Passport: ${traveler.passportNumber} (${traveler.passportCountry || 'Country TBD'}) — Expires ${formatDate(
              traveler.passportExpiry
            )}`
          );
        }
        if (traveler.documents?.length) {
          doc.moveDown(0.25);
          traveler.documents.forEach((document) => {
            doc.fontSize(11).text(
              `• ${document.type} — ${document.status.toUpperCase()} (Expires ${formatDate(document.expiryDate)})`
            );
          });
          doc.moveDown(0.25);
        }
        if (traveler.notes) {
          doc.text(`Notes: ${traveler.notes}`);
        }
        doc.moveDown(0.5);
      });
    }

    if (trip.itineraryItems?.length) {
      doc.addPage();
      doc.fontSize(16).text('Itinerary Highlights', { underline: true });
      doc.moveDown(0.5);
      trip.itineraryItems.forEach((item) => {
        doc.fontSize(12).text(`${formatDate(item.startTime)} — ${item.title}`);
        if (item.location) {
          doc.text(`Location: ${item.location}`);
        }
        if (item.notes) {
          doc.text(item.notes);
        }
        doc.moveDown(0.5);
      });
    }

    const checklistSummary = summarizeChecklist(trip.checklistCategories);
    if (checklistSummary.length) {
      doc.addPage();
      doc.fontSize(16).text('Checklist Summary', { underline: true });
      doc.moveDown(0.5);
      checklistSummary.forEach((category) => {
        doc.fontSize(12).text(`${category.name}`);
        doc.fontSize(11).text(`Completed: ${category.completed}/${category.total}`);
        doc.fontSize(11).text(`Pending: ${category.pending}`);
        doc.moveDown(0.5);
      });
    }

    if (trip.expenses?.length) {
      const total = trip.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      doc.addPage();
      doc.fontSize(16).text('Budget Snapshot', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(
        `Recorded spend: ${trip.budgetCurrency || 'USD'} ${total.toLocaleString()} of planned ${trip.budgetCurrency || 'USD'} ${Number(
          trip.budgetAmount || 0
        ).toLocaleString()}`
      );
      const totalsByCategory = trip.expenses.reduce((acc, expense) => {
        const key = expense.category || 'uncategorized';
        acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
        return acc;
      }, {});
      Object.entries(totalsByCategory).forEach(([category, amount]) => {
        doc.fontSize(11).text(`• ${category}: ${trip.budgetCurrency || 'USD'} ${amount.toLocaleString()}`);
      });
    }
  });

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows) => rows.map((row) => row.map(csvEscape).join(',')).join('\n');

const buildTripCsv = (trip) => {
  const rows = [];
  rows.push(['Trip Overview']);
  rows.push(['Field', 'Value']);
  rows.push(['Name', trip.name]);
  rows.push(['Destination', trip.destination || '']);
  rows.push(['Status', trip.status]);
  rows.push(['Type', trip.type]);
  rows.push(['Start Date', trip.startDate || '']);
  rows.push(['End Date', trip.endDate || '']);
  rows.push(['Budget', `${trip.budgetCurrency || 'USD'} ${trip.budgetAmount}`]);
  rows.push([]);

  if (trip.travelers?.length) {
    rows.push(['Travelers']);
    rows.push(['Full name', 'Preferred name', 'Email', 'Phone', 'Passport country', 'Passport expiry']);
    trip.travelers.forEach((traveler) => {
      rows.push([
        traveler.fullName,
        traveler.preferredName || '',
        traveler.email || '',
        traveler.phone || '',
        traveler.passportCountry || '',
        traveler.passportExpiry || '',
      ]);
    });
    rows.push([]);
  }

  if (trip.checklistCategories?.length) {
    rows.push(['Checklist']);
    rows.push(['Category', 'Completed', 'Total']);
    const summary = summarizeChecklist(trip.checklistCategories);
    summary.forEach((item) => {
      rows.push([item.name, item.completed, item.total]);
    });
    rows.push([]);
  }

  if (trip.itineraryItems?.length) {
    rows.push(['Itinerary']);
    rows.push(['Title', 'Start', 'End', 'Location']);
    trip.itineraryItems.forEach((item) => {
      rows.push([item.title, item.startTime || '', item.endTime || '', item.location || '']);
    });
    rows.push([]);
  }

  return Buffer.from(buildCsv(rows), 'utf-8');
};

const buildBudgetCsv = (trip) => {
  const rows = [];
  rows.push(['Budget']);
  rows.push(['Trip name', trip.name]);
  rows.push(['Planned budget', `${trip.budgetCurrency || 'USD'} ${trip.budgetAmount}`]);
  rows.push([]);
  rows.push(['Expenses']);
  rows.push(['Category', 'Amount', 'Currency', 'Merchant', 'Notes', 'Spent at']);
  (trip.expenses || []).forEach((expense) => {
    rows.push([
      expense.category,
      expense.amount,
      expense.currency,
      expense.merchant || '',
      expense.notes || '',
      expense.spentAt || '',
    ]);
  });
  return Buffer.from(buildCsv(rows), 'utf-8');
};

const buildBudgetPdf = async (trip) =>
  createPdfBuffer((doc) => {
    const totalPlanned = Number(trip.budgetAmount || 0);
    const totalSpent = (trip.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const diff = totalPlanned - totalSpent;

    doc.fontSize(20).text(`${trip.name} — Budget Summary`);
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Planned budget: ${trip.budgetCurrency || 'USD'} ${totalPlanned.toLocaleString()}`);
    doc.text(`Recorded spend: ${trip.budgetCurrency || 'USD'} ${totalSpent.toLocaleString()}`);
    doc.text(`Variance: ${trip.budgetCurrency || 'USD'} ${diff.toLocaleString()}`);

    const totalsByCategory = (trip.expenses || []).reduce((acc, expense) => {
      const key = expense.category || 'uncategorized';
      acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    doc.moveDown(0.75);
    doc.fontSize(14).text('Spend by Category', { underline: true });
    Object.entries(totalsByCategory).forEach(([category, amount]) => {
      doc.fontSize(12).text(`• ${category}: ${trip.budgetCurrency || 'USD'} ${amount.toLocaleString()}`);
    });

    if (trip.expenses?.length) {
      doc.addPage();
      doc.fontSize(14).text('Expense Ledger', { underline: true });
      doc.moveDown(0.5);
      trip.expenses.forEach((expense) => {
        doc.fontSize(12).text(`${formatDate(expense.spentAt)} — ${expense.category} (${expense.currency} ${Number(expense.amount || 0).toFixed(2)})`);
        if (expense.merchant) {
          doc.fontSize(11).text(`Merchant: ${expense.merchant}`);
        }
        if (expense.notes) {
          doc.fontSize(11).text(expense.notes);
        }
        doc.moveDown(0.5);
      });
    }
  });

const buildExportFilename = (trip, resource, formatType) => {
  const safeName = slugify(trip.name || 'trip');
  const now = new Date();
  const dateStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate()
  ).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(
    now.getUTCSeconds()
  ).padStart(2, '0')}`;
  return `${safeName}-${resource}-${dateStamp}.${formatType}`;
};

const exportTripData = async (userId, tripId, { resource, format: formatInput }) => {
  const formatType = normalizeFormat(formatInput);
  const resourceType = normalizeResource(resource);

  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.VIEW });
  const trip = await fetchTripWithAssociations(tripId);

  if (resourceType === EXPORT_RESOURCES.TRIP) {
    if (formatType === EXPORT_FORMATS.PDF) {
      const buffer = await buildTripPdf(trip);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: buildExportFilename(trip, resourceType, formatType),
      };
    }

    const buffer = buildTripCsv(trip);
    return {
      buffer,
      contentType: 'text/csv',
      filename: buildExportFilename(trip, resourceType, formatType),
    };
  }

  if (formatType === EXPORT_FORMATS.PDF) {
    const buffer = await buildBudgetPdf(trip);
    return {
      buffer,
      contentType: 'application/pdf',
      filename: buildExportFilename(trip, resourceType, formatType),
    };
  }

  const buffer = buildBudgetCsv(trip);
  return {
    buffer,
    contentType: 'text/csv',
    filename: buildExportFilename(trip, resourceType, formatType),
  };
};

module.exports = {
  exportTripData,
  EXPORT_RESOURCES,
  EXPORT_FORMATS,
};
