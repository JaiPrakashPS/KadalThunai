/**
 * Pagination helper
 * @param {Object} query - Express req.query
 * @param {number} defaultLimit - default items per page
 */
const paginate = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(200, parseInt(query.limit) || defaultLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination metadata object
 */
const paginateMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = { paginate, paginateMeta };
