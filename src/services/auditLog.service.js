import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs } from '../utils/pagination.js'

/**
 * Phân trang audit logs
 */
const getAuditLogs = async (pagination, orderBy, search, select = {}) => {
    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search)

    const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.auditLog.count({ where: paginationArgs.where }),
    ])

    return { data, total }
}

export default { getAuditLogs }
