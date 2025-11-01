module.exports = {
  TRIP_STATUS: {
    PLANNING: 'planning',
    CONFIRMED: 'confirmed',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  TRIP_TYPES: {
    LEISURE: 'leisure',
    BUSINESS: 'business',
    ADVENTURE: 'adventure',
    FAMILY: 'family',
  },

  DOCUMENT_TYPES: {
    PASSPORT: 'passport',
    VISA: 'visa',
    INSURANCE: 'insurance',
    VACCINATION: 'vaccination',
    LICENSE: 'license',
  },

  DOCUMENT_STATUS: {
    PENDING: 'pending',
    VALID: 'valid',
    EXPIRING_SOON: 'expiring_soon',
    EXPIRED: 'expired',
    APPLIED: 'applied',
    APPROVED: 'approved',
  },

  CHECKLIST_CATEGORIES: {
    DOCUMENTS: 'documents',
    PACKING: 'packing',
    TASKS: 'tasks',
    HEALTH: 'health',
    FINANCIAL: 'financial',
    CONNECTIVITY: 'connectivity',
  },

  PRIORITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  PERMISSION_LEVELS: {
    VIEW: 'view',
    EDIT: 'edit',
    ADMIN: 'admin',
  },

  COLLABORATOR_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
  },

  SHARE_LINK_ACCESS_LEVELS: {
    VIEW: 'view',
    CONTRIBUTE: 'contribute',
  },

  EXPENSE_CATEGORIES: {
    ACCOMMODATION: 'accommodation',
    TRANSPORT: 'transport',
    FOOD: 'food',
    ACTIVITIES: 'activities',
    SHOPPING: 'shopping',
    OTHER: 'other',
  },

  ITINERARY_TYPES: {
    FLIGHT: 'flight',
    ACCOMMODATION: 'accommodation',
    ACTIVITY: 'activity',
    RESTAURANT: 'restaurant',
    TRANSPORT: 'transport',
  },

  TASK_CATEGORIES: {
    HOME_PREP: 'home_prep',
    FINANCIAL: 'financial',
    BOOKINGS: 'bookings',
    COMMUNICATION: 'communication',
  },

  DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS: [
    {
      slug: 'documents',
      name: 'Travel Documents',
      description: 'Passports, visas, IDs, and essential paperwork.',
      sortOrder: 0,
    },
    {
      slug: 'packing',
      name: 'Packing Essentials',
      description: 'Clothing, gear, and items to pack before departure.',
      sortOrder: 1,
    },
    {
      slug: 'tasks',
      name: 'Pre-Trip Tasks',
      description: 'Reservations, bookings, and must-do tasks.',
      sortOrder: 2,
    },
    {
      slug: 'health',
      name: 'Health & Safety',
      description: 'Vaccinations, medications, and travel insurance.',
      sortOrder: 3,
    },
    {
      slug: 'financial',
      name: 'Financial Prep',
      description: 'Budgeting, currency, and payment preparations.',
      sortOrder: 4,
    },
    {
      slug: 'connectivity',
      name: 'Connectivity & Access',
      description: 'Roaming, SIM cards, and digital access essentials.',
      sortOrder: 5,
    },
  ],
};
