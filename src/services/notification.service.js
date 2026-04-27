// ═══════════════════════════════════════════
//  Notification Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildCursorPaginationArgs,
    buildCursorPageInfo,
    processCursorResult,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const NOTIFICATION_FILTER_OPTIONS = {
    keywordFields: ['title', 'content'],
    inFieldMap: {
        typeIn: 'type',
    },
}

// ── Query ──

/**
 * Lấy notification theo ID – chỉ trả về nếu notification thuộc về user hiện tại.
 *
 * @param {string} id - notification ID
 * @param {string} userId - user hiện tại (kiểm tra quyền sở hữu)
 * @param {Object|null} select - Prisma select
 * @returns {Promise<NotificationResponse>}
 */
const getNotificationById = async (id, userId, select) => {
    if (!id) throw new Error('Thiếu ID thông báo')

    const findArgs = { where: { id, userId } }
    if (select) findArgs.select = select

    const notification = await prisma.notification.findFirst(findArgs)

    if (!notification) {
        throw new Error('Không tìm thấy thông báo hoặc bạn không có quyền xem')
    }

    return notification
}

/**
 * Lấy danh sách notification của user (cursor-based pagination).
 *
 * @param {string} userId - user hiện tại
 * @param {Object|null} pagination - { cursor, limit }
 * @param {Object|null} orderBy - { field, order }
 * @param {Object|null} filter - NotificationFilterInput
 * @param {Object|null} select - Prisma select
 * @returns {Promise<NotificationCursorListResponse>}
 */
const getNotifications = async (userId, pagination, orderBy, filter, select) => {
    // Build filter → Prisma where
    const filterWhere = buildPrismaFilter(filter, NOTIFICATION_FILTER_OPTIONS)

    // Luôn scope theo userId hiện tại
    const extraWhere = { ...filterWhere, userId }

    // Build Prisma findMany args (cursor-based)
    const findArgs = buildCursorPaginationArgs(pagination, orderBy, select, extraWhere)

    const items = await prisma.notification.findMany(findArgs)

    // Xử lý cursor result
    const limit = pagination?.limit
    const { data, nextCursor } = processCursorResult(items ?? [], limit)
    const pageInfo = buildCursorPageInfo(limit, nextCursor)

    return {
        nodes: data,
        pageInfo: pageInfo,
    }
}

// ── Mutation ──

/**
 * Đánh dấu một notification là đã đọc.
 *
 * @param {string} userId - user hiện tại
 * @param {Object} input - { notificationId: string }
 * @returns {Promise<NotificationResponse>}
 */
const markAsRead = async (userId, input) => {
    const { notificationId } = input || {}

    if (!notificationId) throw new Error('Thiếu ID thông báo')

    // Kiểm tra notification tồn tại & thuộc về user
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
    })

    if (!notification) {
        throw new Error('Không tìm thấy thông báo hoặc bạn không có quyền')
    }

    // Nếu đã đọc rồi → trả về luôn
    if (notification.isRead) {
        return notification
    }

    // Cập nhật trạng thái đã đọc
    const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    })

    return updated
}

/**
 * Đánh dấu tất cả (hoặc danh sách) notification là đã đọc.
 *
 * @param {string} userId - user hiện tại
 * @param {Object|null} input - { notificationIds?: string[] }
 *   - Nếu truyền notificationIds → chỉ đánh dấu các notification đó
 *   - Nếu không truyền → đánh dấu tất cả notification chưa đọc
 * @returns {Promise<BaseResponse>}
 */
const markAllAsRead = async (userId, input) => {
    const { notificationIds } = input || {}

    const where = {
        userId,
        isRead: false,
    }

    // Nếu có danh sách ID → chỉ update các notification đó
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        where.id = { in: notificationIds }
    }

    const result = await prisma.notification.updateMany({
        where,
        data: {
            isRead: true,
            readAt: new Date(),
        },
    })

    return true
}

export default {
    getNotificationById,
    getNotifications,
    markAsRead,
    markAllAsRead,
}
