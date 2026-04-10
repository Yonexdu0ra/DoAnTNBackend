import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'

const KEYWORD_FIELDS = ['action', 'resource', 'ipAddress', 'userAgent']

// ── Query: danh sách nhật ký hoạt động (admin) ──
const getAuditLogs = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })
    const args = buildPagePaginationArgs(pagination, orderBy, null, filterWhere)

    const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.auditLog.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách nhật ký hoạt động thành công',
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

export default {
    getAuditLogs,
}
