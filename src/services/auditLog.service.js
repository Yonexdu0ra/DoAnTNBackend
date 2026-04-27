// ═══════════════════════════════════════════
//  AuditLog Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const AUDIT_LOG_FILTER_OPTIONS = {
    keywordFields: ['action', 'resource', 'ipAddress', 'userAgent', 'status'],
    inFieldMap: {},
}

// ── Query ──

/**
 * Lấy danh sách nhật ký hoạt động (admin).
 *
 * @param {Object|null} pagination - { page, limit }
 * @param {Object|null} orderBy - { field, order }
 * @param {Object|null} filter - AuditLogFilterInput
 * @param {Object|null} select - Prisma select
 * @returns {Promise<AuditLogListResponse>}
 */
const getAuditLogs = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, AUDIT_LOG_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.auditLog.findMany(findArgs),
        prisma.auditLog.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

export default {
    getAuditLogs,
}
