/**
 * Build Prisma orderBy từ GraphQL orderByInput
 */
export const buildOrderBy = (orderBy) => {
    if (!orderBy || !orderBy.field) return { createdAt: 'desc' }
    const direction = (orderBy.order || 'DESC').toLowerCase()
    return { [orderBy.field]: direction }
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

/**
 * Convert primitive filter (StringFilterInput, IDFilterInput, DateFilterInput, etc.) to Prisma where
 */
const buildPrimitiveFilter = (filterInput) => {
    if (!filterInput || typeof filterInput !== 'object') return undefined

    const prismaFilter = {}

    for (const [op, val] of Object.entries(filterInput)) {
        if (val === undefined || val === null) continue

        switch (op) {
            case 'eq':
                prismaFilter.equals = val
                break
            case 'contains':
                prismaFilter.contains = val
                prismaFilter.mode = 'insensitive'
                break
            case 'startsWith':
                prismaFilter.startsWith = val
                prismaFilter.mode = 'insensitive'
                break
            case 'endsWith':
                prismaFilter.endsWith = val
                prismaFilter.mode = 'insensitive'
                break
            case 'in':
                prismaFilter.in = val
                break
            case 'notIn':
                prismaFilter.notIn = val
                break
            case 'gt':
                prismaFilter.gt = val
                break
            case 'gte':
                prismaFilter.gte = val
                break
            case 'lt':
                prismaFilter.lt = val
                break
            case 'lte':
                prismaFilter.lte = val
                break
            case 'between':
                if (Array.isArray(val) && val.length === 2) {
                    prismaFilter.gte = val[0]
                    prismaFilter.lte = val[1]
                }
                break
        }
    }

    return Object.keys(prismaFilter).length > 0 ? prismaFilter : undefined
}

/**
 * Build Prisma where clause từ GraphQL FilterInput
 * @param {Object} filter - GraphQL filter input (e.g. UserFilterInput, JobFilterInput)
 * @param {Object} options
 * @param {string[]} options.keywordFields - Các trường để search khi keyword được cung cấp (hỗ trợ nested: 'profile.fullName')
 * @param {Object} options.inFieldMap - Map tên field *In sang tên field Prisma { roleIn: 'role', statusIn: 'status' }
 */
export const buildPrismaFilter = (filter, options = {}) => {
    if (!filter) return {}

    const where = {}
    const { keywordFields = [], inFieldMap = {} } = options

    for (const [key, value] of Object.entries(filter)) {
        if (value === undefined || value === null) continue

        // Xử lý keyword search
        if (key === 'keyword') {
            if (value && keywordFields.length > 0) {
                where.OR = keywordFields.map((field) => {
                    const parts = field.split('.')
                    if (parts.length === 1) {
                        return { [field]: { contains: value, mode: 'insensitive' } }
                    }
                    // Build nested where: { profile: { fullName: { contains: 'x' } } }
                    let nested = { contains: value, mode: 'insensitive' }
                    for (let i = parts.length - 1; i >= 0; i--) {
                        nested = { [parts[i]]: nested }
                    }
                    return nested
                })
            }
            continue
        }

        // Xử lý *In suffix (enum arrays)
        if (key.endsWith('In') && Array.isArray(value)) {
            const prismaField = inFieldMap[key] || key.replace(/In$/, '')
            where[prismaField] = { in: value }
            continue
        }

        // Xử lý primitive filter inputs (objects with eq, contains, etc.)
        if (typeof value === 'object' && !Array.isArray(value)) {
            const prismaSubFilter = buildPrimitiveFilter(value)
            if (prismaSubFilter) {
                where[key] = prismaSubFilter
            }
            continue
        }
    }

    return where
}
