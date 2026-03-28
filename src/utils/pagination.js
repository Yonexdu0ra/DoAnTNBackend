/**
 * Build Prisma orderBy từ GraphQL orderByInput
 */
export const buildOrderBy = (orderBy) => {
    if (!orderBy || !orderBy.field) return { createdAt: 'desc' }
    return { [orderBy.field]: orderBy.direction || 'desc' }
}

/**
 * Build Prisma where clause từ GraphQL searchInput
 * Hỗ trợ search trên các trường string
 */
export const buildSearchFilter = (search) => {
    if (!search || !search.field || !search.value) return {}
    return {
        [search.field]: {
            contains: search.value,
            mode: 'insensitive',
        }
    }
}

/**
 * Build Prisma filter clause từ GraphQL filterInput
 */
export const buildFilterWhere = (filter) => {
    if (!filter || !filter.field || !filter.value) return {}

    const operatorMap = {
        eq: 'equals',
        ne: 'not',
        contains: 'contains',
        gt: 'gt',
        gte: 'gte',
        lt: 'lt',
        lte: 'lte',
    }

    const prismaOp = operatorMap[filter.operator] || 'equals'
    return {
        [filter.field]: { [prismaOp]: filter.value }
    }
}

/**
 * Build phân trang (page-based) args cho Prisma
 * Trả về: { skip, take, orderBy, where }
 */
export const buildPagePaginationArgs = (pagination, orderBy, search, additionalWhere = {}) => {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const searchWhere = buildSearchFilter(search)

    return {
        skip,
        take: limit,
        orderBy: buildOrderBy(orderBy),
        where: {
            ...additionalWhere,
            ...searchWhere,
        },
    }
}

/**
 * Build phân trang (cursor-based) args cho Prisma
 * Trả về: { take, cursor, skip, orderBy, where }
 */
export const buildCursorPaginationArgs = (pagination, orderBy, search, additionalWhere = {}) => {
    const limit = pagination?.limit || 10
    const cursor = pagination?.cursor || null

    const searchWhere = buildSearchFilter(search)

    const args = {
        take: limit + 1, // Lấy thêm 1 để biết còn dữ liệu không
        orderBy: buildOrderBy(orderBy),
        where: {
            ...additionalWhere,
            ...searchWhere,
        },
    }

    if (cursor) {
        args.cursor = { id: cursor }
        args.skip = 1 // Skip cursor item
    }

    return args
}

/**
 * Process kết quả cursor-based pagination
 * Trả về: { data, nextCursor }
 */
export const processCursorResult = (items, limit) => {
    const hasMore = items.length > limit
    const data = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? data[data.length - 1]?.id : null

    return { data, nextCursor }
}
