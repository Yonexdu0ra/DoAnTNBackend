// ═══════════════════════════════════════════════════════════════
//  Pagination & Filter utilities dùng chung cho tất cả queries
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 200

// ───────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────

/**
 * Clamp limit trong khoảng [1, MAX_LIMIT], mặc định DEFAULT_LIMIT
 */
const clampLimit = (limit) => {
    if (!limit || typeof limit !== 'number' || limit < 1) return DEFAULT_LIMIT
    return Math.min(limit, MAX_LIMIT)
}

/**
 * Clamp page >= 1, mặc định DEFAULT_PAGE
 */
const clampPage = (page) => {
    if (!page || typeof page !== 'number' || page < 1) return DEFAULT_PAGE
    return Math.floor(page)
}

/**
 * Build Prisma orderBy từ SortOrderInput { field, order }
 * @param {Object|null} orderByInput - { field: string, order: 'ASC'|'DESC' }
 * @param {string} defaultField - field mặc định nếu không truyền
 * @param {string} defaultOrder - order mặc định nếu không truyền
 * @returns {Object} Prisma orderBy object
 */
const buildOrderBy = (orderByInput, defaultField = 'createdAt', defaultOrder = 'desc') => {
    const field = orderByInput?.field || defaultField
    const order = (orderByInput?.order || defaultOrder).toLowerCase()

    // Hỗ trợ nested field: VD 'profile.fullName' → { profile: { fullName: order } }
    const parts = field.split('.')
    if (parts.length === 1) {
        return { [field]: order }
    }

    // xử lý nested như 'profile.fullName' → { profile: { fullName: 'desc' } }
    let result = { [parts[parts.length - 1]]: order }
    for (let i = parts.length - 2; i >= 0; i--) {
        result = { [parts[i]]: result }
    }
    return result
}

// ───────────────────────────────────────────
//  Page-based pagination (offset)
// ───────────────────────────────────────────

/**
 * Tạo Prisma findMany args cho page-based pagination.
 *
 * @param {Object|null} pagination - { page?: number, limit?: number }
 * @param {Object|null} orderByInput - { field?: string, order?: 'ASC'|'DESC' }
 * @param {Object|null} select - Prisma select object (nếu có)
 * @param {Object} extraWhere - điều kiện where bổ sung
 * @returns {{ skip: number, take: number, orderBy: Object, where: Object, select?: Object }}
 */
export const buildPagePaginationArgs = (pagination, orderByInput, select, extraWhere = {}) => {
    const page = clampPage(pagination?.page)
    const limit = clampLimit(pagination?.limit)
    const skip = (page - 1) * limit

    const args = {
        skip,
        take: limit,
        orderBy: buildOrderBy(orderByInput),
        where: { ...extraWhere },
    }

    if (select) {
        args.select = select
    }

    return args
}

/**
 * Tạo PageInfo response chuẩn cho page-based pagination.
 *
 * @param {Object|null} pagination - { page?: number, limit?: number }
 * @param {number} total - tổng số record
 * @returns {{ page: number, limit: number, total: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
export const buildPageInfo = (pagination, total) => {
    const page = clampPage(pagination?.page)
    const limit = clampLimit(pagination?.limit)
    const totalPages = Math.ceil(total / limit)

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    }
}

// ───────────────────────────────────────────
//  Cursor-based pagination
// ───────────────────────────────────────────

/**
 * Tạo Prisma findMany args cho cursor-based pagination.
 *
 * @param {Object|null} pagination - { cursor?: string, limit?: number }
 * @param {Object|null} orderByInput - { field?: string, order?: 'ASC'|'DESC' }
 * @param {Object|null} select - Prisma select object (nếu có)
 * @param {Object} extraWhere - điều kiện where bổ sung
 * @returns {{ take: number, cursor?: Object, skip?: number, orderBy: Object, where: Object, select?: Object }}
 */
export const buildCursorPaginationArgs = (pagination, orderByInput, select, extraWhere = {}) => {
    const limit = clampLimit(pagination?.limit)

    const args = {
        take: limit + 1, // lấy thêm 1 phần tử để kiểm tra hasNextPage
        orderBy: buildOrderBy(orderByInput),
        where: { ...extraWhere },
    }

    if (pagination?.cursor) {
        args.cursor = { id: pagination.cursor }
        args.skip = 1 // bỏ qua cursor hiện tại
    }

    if (select) {
        args.select = select
    }

    return args
}

/**
 * Xử lý kết quả cursor-based pagination:
 * - Cắt bớt phần tử thừa (phần tử thứ limit + 1)
 * - Trả về nextCursor nếu còn dữ liệu
 *
 * @param {Array} items - danh sách items từ Prisma findMany
 * @param {number} limit - số lượng items yêu cầu
 * @returns {{ data: Array, nextCursor: string|null }}
 */
export const processCursorResult = (items, limit) => {
    const safeLimit = clampLimit(limit)
    const hasMore = items.length > safeLimit
    const data = hasMore ? items.slice(0, safeLimit) : items
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

    return { data, nextCursor }
}

/**
 * Tạo CursorPageInfo response chuẩn.
 *
 * @param {number} limit - số items trên mỗi page
 * @param {string|null} nextCursor - cursor tiếp theo
 * @returns {{ limit: number, nextCursor: string|null, hasNextPage: boolean }}
 */
export const buildCursorPageInfo = (limit, nextCursor) => ({
    limit: clampLimit(limit),
    nextCursor,
    hasNextPage: !!nextCursor,
})

// ───────────────────────────────────────────
//  Prisma filter builder
// ───────────────────────────────────────────

/**
 * Map một primitive filter input (StringFilterInput, IDFilterInput, ...) sang Prisma where.
 * @param {Object} filterInput - ví dụ { eq: 'hello', contains: 'world', in: ['a','b'] }
 * @returns {Object} Prisma where condition cho 1 field
 */
const mapPrimitiveFilter = (filterInput) => {
    if (!filterInput || typeof filterInput !== 'object') return undefined

    const prismaCondition = {}

    // String / ID / general
    if (filterInput.eq !== undefined) prismaCondition.equals = filterInput.eq
    if (filterInput.contains !== undefined) prismaCondition.contains = filterInput.contains
    if (filterInput.startsWith !== undefined) prismaCondition.startsWith = filterInput.startsWith
    if (filterInput.endsWith !== undefined) prismaCondition.endsWith = filterInput.endsWith
    if (filterInput.in !== undefined) prismaCondition.in = filterInput.in
    if (filterInput.notIn !== undefined) prismaCondition.notIn = filterInput.notIn

    // Int / Float / Date comparisons
    if (filterInput.gt !== undefined) prismaCondition.gt = filterInput.gt
    if (filterInput.gte !== undefined) prismaCondition.gte = filterInput.gte
    if (filterInput.lt !== undefined) prismaCondition.lt = filterInput.lt
    if (filterInput.lte !== undefined) prismaCondition.lte = filterInput.lte

    // Date between
    if (Array.isArray(filterInput.between) && filterInput.between.length === 2) {
        prismaCondition.gte = filterInput.between[0]
        prismaCondition.lte = filterInput.between[1]
    }

    // String mode: case-insensitive (áp dụng nếu có contains/startsWith/endsWith)
    if (filterInput.contains || filterInput.startsWith || filterInput.endsWith) {
        prismaCondition.mode = 'insensitive'
    }

    return Object.keys(prismaCondition).length > 0 ? prismaCondition : undefined
}

/**
 * Build Prisma where clause từ GraphQL FilterInput.
 *
 * Hỗ trợ:
 * - Các trường primitive filter (StringFilterInput, IDFilterInput, DateFilterInput, ...)
 * - `keyword` field → tìm kiếm OR across nhiều field (insensitive contains)
 * - `inFieldMap` → map tên field GraphQL sang tên field Prisma (ví dụ: roleIn → role, statusIn → status)
 *
 * @param {Object|null} filter - GraphQL filter input
 * @param {Object} options
 * @param {string[]} options.keywordFields - danh sách field Prisma để tìm keyword (OR)
 * @param {Object} options.inFieldMap - map { graphqlFieldName: prismaFieldName } cho enum "In" fields
 * @returns {Object} Prisma where clause
 */
export const buildPrismaFilter = (filter, options = {}) => {
    if (!filter || typeof filter !== 'object') return {}

    const { keywordFields = [], inFieldMap = {} } = options
    const where = {}

    for (const [key, value] of Object.entries(filter)) {
        if (value === undefined || value === null) continue

        // keyword → OR search across multiple fields
        if (key === 'keyword') {
            if (typeof value === 'string' && value.trim().length > 0 && keywordFields.length > 0) {
                const keyword = value.trim()
                where.OR = keywordFields.map((field) => {
                    // hỗ trợ nested field: 'profile.fullName'
                    const parts = field.split('.')
                    if (parts.length === 1) {
                        return { [field]: { contains: keyword, mode: 'insensitive' } }
                    }
                    // nested: { profile: { fullName: { contains: keyword, mode: 'insensitive' } } }
                    let result = { [parts[parts.length - 1]]: { contains: keyword, mode: 'insensitive' } }
                    for (let i = parts.length - 2; i >= 0; i--) {
                        result = { [parts[i]]: result }
                    }
                    return result
                })
            }
            continue
        }

        // Enum "In" fields: ví dụ roleIn: [ADMIN, MANAGER] → role: { in: [...] }
        if (inFieldMap[key]) {
            const prismaField = inFieldMap[key]
            if (Array.isArray(value) && value.length > 0) {
                where[prismaField] = { in: value }
            }
            continue
        }

        // Primitive filter inputs (object với eq, contains, gt, lte, ...)
        if (typeof value === 'object' && !Array.isArray(value)) {
            const condition = mapPrimitiveFilter(value)
            if (condition) {
                where[key] = condition
            }
            continue
        }
    }

    return where
}
