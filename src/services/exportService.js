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

const REPORT_THEME = {
  colors: {
    primary: '#0F5B78',
    accent: '#F97316',
    text: '#0F172A',
    muted: '#475569',
    subtle: '#94A3B8',
    border: '#E2E8F0',
    surface: '#F8FAFC',
    surfaceAlt: '#EEF2FF',
  },
  fonts: {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
  },
  fontSizes: {
    overline: 9,
    h1: 24,
    h2: 16,
    h3: 13,
    body: 11,
    small: 9,
  },
  radius: 10,
};

const CURRENCY_SYMBOL_FALLBACKS = {
  INR: 'INR ',
  LKR: 'LKR ',
  NPR: 'NPR ',
  PKR: 'PKR ',
  BDT: 'BDT ',
};

const chunkArray = (items, size) => {
  if (!Array.isArray(items) || !items.length) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const getContentWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

const resetCursorX = (doc) => {
  doc.x = doc.page.margins.left;
};

const writeFullWidthText = (doc, text, options = {}) => {
  const textOptions = {
    width: getContentWidth(doc),
    ...options,
  };
  doc.text(text, doc.page.margins.left, doc.y, textOptions);
  resetCursorX(doc);
};

const ensureSpace = (doc, required = 40) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + required > bottom) {
    doc.addPage();
  }
};

const applyReportBranding = (doc) => {
  doc.font(REPORT_THEME.fonts.regular);
  doc.fillColor(REPORT_THEME.colors.text);
  doc.lineJoin('round');
};

const formatCurrency = (amount, currency = 'USD') => {
  const safeAmount = Number(amount || 0);
  const safeCurrency = (currency || 'USD').toString().toUpperCase();
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
    });
    const formatted = formatter.format(safeAmount);
    const currencyPart = formatter
      .formatToParts(safeAmount)
      .find((part) => part.type === 'currency')?.value;
    const fallback = CURRENCY_SYMBOL_FALLBACKS[safeCurrency];
    if (fallback && currencyPart) {
      return formatted.replace(currencyPart, fallback);
    }
    return formatted;
  } catch (error) {
    return `${safeCurrency} ${safeAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const formatDateRange = (start, end) => `${formatDate(start)} - ${formatDate(end)}`;

const drawHeroSection = (doc, { eyebrow, title, subtitle, meta, badge }) => {
  const width = getContentWidth(doc);
  const height = 120;
  ensureSpace(doc, height + 20);
  const startX = doc.page.margins.left;
  const startY = doc.y;

  doc.save();
  doc.roundedRect(startX, startY, width, height, REPORT_THEME.radius + 2).fill(REPORT_THEME.colors.primary);
  doc.fillColor('#FFFFFF');
  doc.font(REPORT_THEME.fonts.bold).fontSize(REPORT_THEME.fontSizes.overline).text(
    (eyebrow || 'Overview').toUpperCase(),
    startX + 24,
    startY + 18,
    { width: width - 48 }
  );
  doc.font(REPORT_THEME.fonts.bold).fontSize(REPORT_THEME.fontSizes.h1).text(title, startX + 24, startY + 34, {
    width: width - 48,
  });
  if (subtitle) {
    doc.font(REPORT_THEME.fonts.regular).fontSize(12).text(subtitle, startX + 24, startY + 70, {
      width: width - 48,
    });
  }
  if (meta) {
    doc.font(REPORT_THEME.fonts.regular).fontSize(11).text(meta, startX + 24, startY + 90, {
      width: width - 48,
    });
  }
  if (badge) {
    const badgeLabel = badge.toUpperCase();
    doc.font(REPORT_THEME.fonts.bold).fontSize(REPORT_THEME.fontSizes.overline);
    const textWidth = doc.widthOfString(badgeLabel);
    const pillWidth = textWidth + 24;
    const pillX = startX + width - pillWidth - 24;
    const pillY = startY + 14;
    doc.roundedRect(pillX, pillY, pillWidth, 22, 11).fill('#FFFFFF');
    doc.fillColor(REPORT_THEME.colors.primary).text(badgeLabel, pillX + 12, pillY + 6);
  }
  doc.restore();
  doc.fillColor(REPORT_THEME.colors.text);
  doc.y = startY + height + 18;
  resetCursorX(doc);
};

const drawStatCards = (doc, stats = [], { columns = 3 } = {}) => {
  if (!stats.length) return;
  const normalizedColumns = Math.max(1, Math.min(columns, 3));
  const rows = chunkArray(stats, normalizedColumns);
  const width = getContentWidth(doc);
  const gap = 12;
  const cardWidth = (width - gap * (normalizedColumns - 1)) / normalizedColumns;
  const cardHeight = 72;

  rows.forEach((row) => {
    ensureSpace(doc, cardHeight + 16);
    const rowY = doc.y;
    row.forEach((stat, index) => {
      const x = doc.page.margins.left + index * (cardWidth + gap);
      doc.save();
      doc.roundedRect(x, rowY, cardWidth, cardHeight, REPORT_THEME.radius).fill(REPORT_THEME.colors.surface);
      doc.restore();
      doc.font(REPORT_THEME.fonts.bold)
        .fontSize(REPORT_THEME.fontSizes.overline)
        .fillColor(REPORT_THEME.colors.muted)
        .text((stat.label || '').toString().toUpperCase(), x + 14, rowY + 12, { width: cardWidth - 28 });
      doc.font(REPORT_THEME.fonts.bold)
        .fontSize(REPORT_THEME.fontSizes.h3)
        .fillColor(REPORT_THEME.colors.text)
        .text(stat.value || '—', x + 14, rowY + 28, { width: cardWidth - 28 });
      if (stat.hint) {
        doc.font(REPORT_THEME.fonts.regular)
          .fontSize(REPORT_THEME.fontSizes.small)
          .fillColor(REPORT_THEME.colors.muted)
          .text(stat.hint, x + 14, rowY + 48, { width: cardWidth - 28 });
      }
    });
    doc.y = rowY + cardHeight + 14;
  });
  doc.moveDown(0.5);
  doc.fillColor(REPORT_THEME.colors.text);
};

const drawSectionHeader = (doc, title, description) => {
  ensureSpace(doc, 48);
  doc.moveDown(0.7);
  resetCursorX(doc);
  const indicatorY = Math.max(doc.page.margins.top + 4, doc.y - 6);
  doc.save();
  doc.rect(doc.page.margins.left, indicatorY, 32, 4).fill(REPORT_THEME.colors.accent);
  doc.restore();
  doc.moveDown(0.2);
  doc.font(REPORT_THEME.fonts.bold)
    .fontSize(REPORT_THEME.fontSizes.h2)
    .fillColor(REPORT_THEME.colors.text);
  writeFullWidthText(doc, title);
  if (description) {
    doc.font(REPORT_THEME.fonts.regular)
      .fontSize(REPORT_THEME.fontSizes.body)
      .fillColor(REPORT_THEME.colors.muted);
    writeFullWidthText(doc, description);
  }
  doc.fillColor(REPORT_THEME.colors.text);
  doc.moveDown(0.4);
};

const drawParagraphBlock = (doc, paragraphs = []) => {
  const content = paragraphs.filter((text) => Boolean(text && text.trim()));
  content.forEach((text) => {
    const height = doc.heightOfString(text, { width: getContentWidth(doc) });
    ensureSpace(doc, height + 10);
    doc.font(REPORT_THEME.fonts.regular)
      .fontSize(REPORT_THEME.fontSizes.body)
      .fillColor(REPORT_THEME.colors.text);
    writeFullWidthText(doc, text, { lineGap: 4 });
    doc.moveDown(0.3);
  });
  doc.fillColor(REPORT_THEME.colors.text);
};

const renderTable = (doc, { columns = [], rows = [] }) => {
  if (!columns.length || !rows.length) {
    return;
  }

  const tableWidth = getContentWidth(doc);
  const columnUnits = columns.map((column) => column.width || 1);
  const totalUnits = columnUnits.reduce((sum, value) => sum + value, 0);
  const columnWidths = columnUnits.map((value) => (tableWidth * value) / totalUnits);
  const paddingX = 8;
  const paddingY = 6;

  const getRowHeight = (cells, fontName) => {
    doc.save();
    doc.font(fontName || REPORT_THEME.fonts.regular).fontSize(REPORT_THEME.fontSizes.body);
    let maxHeight = 0;
    cells.forEach((cell, index) => {
      const text = cell || '—';
      const width = columnWidths[index] - paddingX * 2;
      const height = doc.heightOfString(text, {
        width,
        align: 'left',
        lineGap: 2,
      });
      maxHeight = Math.max(maxHeight, height);
    });
    doc.restore();
    return maxHeight + paddingY * 2;
  };

  const drawRow = (cells, { background, color, font = REPORT_THEME.fonts.regular } = {}) => {
    const rowHeight = getRowHeight(cells, font);
    ensureSpace(doc, rowHeight + 8);
    const rowY = doc.y;
    if (background) {
      doc.save();
      doc.roundedRect(doc.page.margins.left, rowY - 2, tableWidth, rowHeight + 4, 4).fill(background);
      doc.restore();
    }
    let cursorX = doc.page.margins.left;
    cells.forEach((cell, index) => {
      doc.save();
      doc.fillColor(color || REPORT_THEME.colors.text);
      doc.font(font).fontSize(REPORT_THEME.fontSizes.body);
      doc.text(cell || '—', cursorX + paddingX, rowY + paddingY, {
        width: columnWidths[index] - paddingX * 2,
        lineGap: 2,
      });
      doc.restore();
      cursorX += columnWidths[index];
    });
    doc.y = rowY + rowHeight;
    doc.fillColor(REPORT_THEME.colors.text);
  };

  const headerLabels = columns.map((column) => column.label || '');
  drawRow(headerLabels, {
    background: REPORT_THEME.colors.surfaceAlt,
    color: REPORT_THEME.colors.primary,
    font: REPORT_THEME.fonts.bold,
  });

  rows.forEach((row, index) => {
    const isStriped = index % 2 === 0;
    drawRow(row, {
      background: isStriped ? REPORT_THEME.colors.surface : undefined,
    });
  });

  doc.moveDown(0.6);
};

const drawChecklistSummary = (doc, checklist = []) => {
  checklist.forEach((category) => {
    const label = `${category.name || 'Category'} · ${category.completed}/${category.total} completed`;
    const progress = category.total ? Math.min(1, category.completed / category.total) : 0;
    const width = getContentWidth(doc);
    const barHeight = 10;
    ensureSpace(doc, barHeight + 28);
    resetCursorX(doc);
    doc.font(REPORT_THEME.fonts.bold)
      .fontSize(REPORT_THEME.fontSizes.body)
      .fillColor(REPORT_THEME.colors.text);
    writeFullWidthText(doc, label, { width });
    doc.moveDown(0.1);
    doc.save();
    doc.roundedRect(doc.page.margins.left, doc.y, width, barHeight, barHeight / 2).fill(REPORT_THEME.colors.border);
    doc.restore();
    doc.save();
    doc.roundedRect(doc.page.margins.left, doc.y, width * progress, barHeight, barHeight / 2).fill(REPORT_THEME.colors.accent);
    doc.restore();
    doc.y += barHeight + 10;
  });
  doc.fillColor(REPORT_THEME.colors.text);
};

const drawTimelineList = (doc, entries = []) => {
  entries.forEach((entry) => {
    ensureSpace(doc, 42);
    resetCursorX(doc);
    const primaryLine = `${formatDate(entry.startTime)} · ${entry.title}`;
    doc.font(REPORT_THEME.fonts.bold)
      .fontSize(REPORT_THEME.fontSizes.body)
      .fillColor(REPORT_THEME.colors.text);
    writeFullWidthText(doc, primaryLine);
    const detailParts = [entry.location, entry.type?.toUpperCase()].filter(Boolean).join('  •  ');
    if (detailParts) {
      doc.font(REPORT_THEME.fonts.regular)
        .fontSize(REPORT_THEME.fontSizes.small)
        .fillColor(REPORT_THEME.colors.muted);
      writeFullWidthText(doc, detailParts);
    }
    if (entry.notes) {
      doc.font(REPORT_THEME.fonts.regular)
        .fontSize(REPORT_THEME.fontSizes.small)
        .fillColor(REPORT_THEME.colors.subtle);
      writeFullWidthText(doc, entry.notes);
    }
    doc.fillColor(REPORT_THEME.colors.text);
    doc.moveDown(0.4);
  });
};

const drawFooterNote = (doc, label) => {
  doc.moveDown(1);
  resetCursorX(doc);
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
  doc.font(REPORT_THEME.fonts.regular)
    .fontSize(REPORT_THEME.fontSizes.small)
    .fillColor(REPORT_THEME.colors.subtle);
  writeFullWidthText(doc, `${label} · Generated ${timestamp} UTC`, { align: 'right' });
  doc.fillColor(REPORT_THEME.colors.text);
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

const tallyChecklist = (summary = []) =>
  summary.reduce(
    (acc, category) => ({
      total: acc.total + category.total,
      completed: acc.completed + category.completed,
    }),
    { total: 0, completed: 0 }
  );

const buildTripPdf = async (trip) =>
  createPdfBuffer((doc) => {
    applyReportBranding(doc);

    const checklistSummary = summarizeChecklist(trip.checklistCategories);
    const checklistTotals = tallyChecklist(checklistSummary);
    const travelers = trip.travelers || [];
    const expenses = trip.expenses || [];
    const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const variance = Number(trip.budgetAmount || 0) - totalSpent;

    drawHeroSection(doc, {
      eyebrow: 'Trip Summary',
      title: trip.name || 'Untitled Trip',
      subtitle: `${trip.destination || 'Destination TBD'} • ${formatDateRange(trip.startDate, trip.endDate)}`,
      meta: `${trip.type || 'Trip'} · ${travelers.length} traveler${travelers.length === 1 ? '' : 's'}`,
      badge: trip.status,
    });

    const confirmedTravelers = travelers.filter((traveler) => traveler?.status === 'confirmed').length;

    const statCards = [
      { label: 'Destination', value: trip.destination || 'To be decided' },
      { label: 'Trip Window', value: formatDateRange(trip.startDate, trip.endDate) },
      {
        label: 'Travel Party',
        value: `${travelers.length} traveler${travelers.length === 1 ? '' : 's'}`,
        hint: confirmedTravelers ? `${confirmedTravelers} confirmed` : undefined,
      },
      {
        label: 'Checklist',
        value: checklistTotals.total ? `${checklistTotals.completed}/${checklistTotals.total} done` : 'No tasks yet',
        hint: checklistTotals.total ? `${Math.round((checklistTotals.completed / checklistTotals.total) * 100)}% complete` : undefined,
      },
      {
        label: 'Budget Plan',
        value: formatCurrency(trip.budgetAmount || 0, trip.budgetCurrency),
        hint: `${formatCurrency(totalSpent, trip.budgetCurrency)} recorded`,
      },
      {
        label: 'Variance',
        value: formatCurrency(variance, trip.budgetCurrency),
        hint: variance >= 0 ? 'Headroom remaining' : 'Over plan',
      },
    ];

    drawStatCards(doc, statCards, { columns: 3 });

    if (trip.description || trip.notes) {
      drawSectionHeader(doc, 'Overview', 'A quick brief for coordinators and travelers.');
      drawParagraphBlock(doc, [trip.description, trip.notes]);
    }

    if (travelers.length) {
      drawSectionHeader(doc, 'Travel Party & Documents', 'Latest contact info and document readiness.');
      const travelerRows = travelers.map((traveler) => {
        const contact = [traveler.email, traveler.phone].filter(Boolean).join('\n');
        const documentSummary = (traveler.documents || [])
          .map((document) =>
            `${document.type || 'Document'} — ${document.status?.toUpperCase() || 'UNKNOWN'} (exp ${formatDate(document.expiryDate)})`
          )
          .join('\n');
        const notes = traveler.notes && traveler.notes.trim() ? traveler.notes.trim() : '';
        return [traveler.fullName || 'Traveler', contact || '—', documentSummary || '—', notes || '—'];
      });

      renderTable(doc, {
        columns: [
          { label: 'Traveler', width: 1.4 },
          { label: 'Contact', width: 1.2 },
          { label: 'Documents', width: 1.3 },
          { label: 'Notes', width: 1 },
        ],
        rows: travelerRows,
      });
    }

    if (checklistSummary.length) {
      drawSectionHeader(doc, 'Checklist Health', 'Progress by category to surface gaps early.');
      drawChecklistSummary(doc, checklistSummary);
    }

    if (trip.itineraryItems?.length) {
      drawSectionHeader(doc, 'Itinerary Snapshot', 'Upcoming highlights shared with the travel party.');
      drawTimelineList(doc, trip.itineraryItems.slice(0, 8));
    }

    if (expenses.length) {
      drawSectionHeader(doc, 'Budget Pulse', 'How recorded spend compares to the plan.');
      const budgetStats = [
        { label: 'Planned Budget', value: formatCurrency(trip.budgetAmount || 0, trip.budgetCurrency) },
        { label: 'Recorded Spend', value: formatCurrency(totalSpent, trip.budgetCurrency) },
        {
          label: 'Variance',
          value: formatCurrency(variance, trip.budgetCurrency),
          hint: variance >= 0 ? 'Available to spend' : 'Over plan',
        },
      ];
      drawStatCards(doc, budgetStats, { columns: 3 });

      const totalsByCategory = expenses.reduce((acc, expense) => {
        const key = (expense.category || 'Uncategorized').toUpperCase();
        acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
        return acc;
      }, {});

      const categoryRows = Object.entries(totalsByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {
          const share = totalSpent ? Math.round((amount / totalSpent) * 100) : 0;
          return [category, formatCurrency(amount, trip.budgetCurrency), `${share}% of spend`];
        });

      renderTable(doc, {
        columns: [
          { label: 'Category', width: 1.4 },
          { label: 'Amount', width: 1 },
          { label: 'Share', width: 0.8 },
        ],
        rows: categoryRows,
      });
    }

    drawFooterNote(doc, trip.name || 'Trip Summary');
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
    applyReportBranding(doc);

    const expenses = trip.expenses || [];
    const totalPlanned = Number(trip.budgetAmount || 0);
    const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const variance = totalPlanned - totalSpent;
    const totalsByCategory = expenses.reduce((acc, expense) => {
      const key = (expense.category || 'Uncategorized').toUpperCase();
      acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    drawHeroSection(doc, {
      eyebrow: 'Budget & Expenses',
      title: `${trip.name || 'Trip'} Budget Report`,
      subtitle: `${trip.destination || 'Destination TBD'} • ${formatDateRange(trip.startDate, trip.endDate)}`,
      meta: `${trip.type || 'Trip'} · ${expenses.length} expense${expenses.length === 1 ? '' : 's'}`,
      badge: variance >= 0 ? 'On Track' : 'Over Plan',
    });

    const statCards = [
      { label: 'Planned Budget', value: formatCurrency(totalPlanned, trip.budgetCurrency) },
      { label: 'Recorded Spend', value: formatCurrency(totalSpent, trip.budgetCurrency) },
      {
        label: 'Variance',
        value: formatCurrency(variance, trip.budgetCurrency),
        hint: variance >= 0 ? 'Remaining headroom' : 'Over plan',
      },
      {
        label: 'Active Categories',
        value: Object.keys(totalsByCategory).length.toString(),
        hint: 'Budget envelopes in use',
      },
      {
        label: 'Average Expense',
        value: expenses.length ? formatCurrency(totalSpent / expenses.length, trip.budgetCurrency) : formatCurrency(0, trip.budgetCurrency),
      },
    ];

    drawStatCards(doc, statCards, { columns: 3 });

    if (Object.keys(totalsByCategory).length) {
      drawSectionHeader(doc, 'Category Breakdown', 'Where spend is landing across envelopes.');
      const rows = Object.entries(totalsByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {
          const share = totalSpent ? Math.round((amount / totalSpent) * 100) : 0;
          const lineItemCount = expenses.filter(
            (expense) => (expense.category || 'Uncategorized').toUpperCase() === category
          ).length;
          return [
            category,
            formatCurrency(amount, trip.budgetCurrency),
            `${share}% of spend`,
            `${lineItemCount} item${lineItemCount === 1 ? '' : 's'}`,
          ];
        });

      renderTable(doc, {
        columns: [
          { label: 'Category', width: 1.4 },
          { label: 'Spend', width: 1 },
          { label: 'Share', width: 0.8 },
          { label: 'Line Items', width: 0.8 },
        ],
        rows,
      });
    }

    if (expenses.length) {
      const merchantTotals = expenses.reduce((acc, expense) => {
        const key = expense.merchant || 'Other vendors';
        if (!acc[key]) {
          acc[key] = { amount: 0, count: 0 };
        }
        acc[key].amount += Number(expense.amount || 0);
        acc[key].count += 1;
        return acc;
      }, {});

      const topMerchants = Object.entries(merchantTotals)
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 5)
        .map(([merchant, data]) =>
          `${merchant} — ${formatCurrency(data.amount, trip.budgetCurrency)} across ${data.count} charge${data.count === 1 ? '' : 's'}`
        );

      if (topMerchants.length) {
        drawSectionHeader(doc, 'Top Merchants', 'Vendors contributing the most to this budget.');
        drawParagraphBlock(doc, topMerchants);
      }

      drawSectionHeader(doc, 'Expense Ledger', 'Line-by-line details ready for finance or auditors.');
      const ledgerRows = expenses
        .sort((a, b) => new Date(a.spentAt || 0) - new Date(b.spentAt || 0))
        .map((expense) => [
          formatDate(expense.spentAt),
          expense.category || 'Uncategorized',
          expense.merchant || '—',
          formatCurrency(expense.amount || 0, expense.currency || trip.budgetCurrency),
          expense.notes || '—',
        ]);

      renderTable(doc, {
        columns: [
          { label: 'Date', width: 0.8 },
          { label: 'Category', width: 1 },
          { label: 'Merchant', width: 1 },
          { label: 'Amount', width: 0.9 },
          { label: 'Notes', width: 1.2 },
        ],
        rows: ledgerRows,
      });
    } else {
      drawSectionHeader(doc, 'Expense Ledger', 'Line-by-line details ready for finance or auditors.');
      drawParagraphBlock(doc, ['No expenses recorded yet. Export once charges are tracked.']);
    }

    drawFooterNote(doc, `${trip.name || 'Trip'} Budget Report`);
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
