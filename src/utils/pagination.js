const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const sanitizeNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const parsePagination = (query = {}, options = {}) => {
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = options.maxLimit || MAX_LIMIT;

  const rawPage = sanitizeNumber(query.page, 1);
  const rawLimit = sanitizeNumber(query.limit, defaultLimit);

  const page = rawPage > 0 ? rawPage : 1;
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.max(Math.ceil(total / limit) || 1, 1);
  const clampedPage = Math.min(page, totalPages);

  return {
    page: clampedPage,
    limit,
    total,
    totalPages,
    hasMore: clampedPage < totalPages,
  };
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
