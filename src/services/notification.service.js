import prisma from '../configs/prismaClient.js'
import { buildCursorPaginationArgs, processCursorResult, buildPrismaFilter } from '../utils/pagination.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'

const KEYWORD_FIELDS = ['title', 'content']
const IN_FIELD_MAP = { typeIn: 'type' }

// ── Helper: tạo notification + publish qua pubsub ──
export const createAndPublishNotification = async ({
    userId,
    title,
    content,
    type = 'SYSTEM',
    refType = null,
    refId = null,
}) => {
    const notification = await prisma.notification.create({
        data: { userId, title, content, type, refType, refId },
    })

    pubsub.publish(EVENTS.NOTIFICATION_RECEIVED, {
        userReceivedNotification: {
            status: 'success',
            code: 200,
            message: 'Bạn có thông báo mới',
            data: notification,
        },
        targetUserId: userId,
    })

    return notification
}

// ── Query: lấy danh sách thông báo (cursor-based) ──
const getNotifications = async (userId, pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const limit = pagination?.limit || 10
    const args = buildCursorPaginationArgs(pagination, orderBy, null, {
        userId,
        ...filterWhere,
    })

    const items = await prisma.notification.findMany({
        ...args,
        ...(select ? { select } : {}),
    })
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách thông báo thành công',
        data,
        pagination: {
            limit,
            nextCursor,
            hasNextPage: !!nextCursor,
        },
    }
}

// ── Mutation: đánh dấu đã đọc 1 thông báo ──
const markAsRead = async (userId, input) => {
    const notification = await prisma.notification.findFirst({
        where: { id: input.notificationId, userId },
    })
    if (!notification) throw new Error('Thông báo không tồn tại')

    const updated = await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true, readAt: new Date() },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Đánh dấu đã đọc thành công',
        data: updated,
    }
}

// ── Mutation: đánh dấu tất cả đã đọc ──
const markAllAsRead = async (userId, input) => {
    const where = { userId, isRead: false }
    if (input?.notificationIds?.length > 0) {
        where.id = { in: input.notificationIds }
    }

    await prisma.notification.updateMany({
        where,
        data: { isRead: true, readAt: new Date() },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Đánh dấu tất cả đã đọc thành công',
    }
}

export default {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createAndPublishNotification,
}
