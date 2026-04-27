// ═══════════════════════════════════════════════════════════════
//  FCM (Firebase Cloud Messaging) Service
//  Xử lý gửi push notification + tạo in-app notification
// ═══════════════════════════════════════════════════════════════

import admin from '../configs/firebaseAdmin.js'
import prisma from '../configs/prismaClient.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'

// ───────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────

/**
 * Lấy danh sách FCM token hợp lệ của 1 user từ bảng UserDevice.
 * @param {string} userId
 * @returns {Promise<string[]>} danh sách token
 */
const getFcmTokensByUserId = async (userId) => {
    const devices = await prisma.userDevice.findMany({
        where: { userId },
        select: { fcmToken: true, id: true },
    })
    return devices
        .filter((d) => d.fcmToken && d.fcmToken.trim().length > 0)
        .map((d) => ({ token: d.fcmToken, deviceId: d.id }))
}

/**
 * Lấy danh sách FCM token hợp lệ của nhiều user từ bảng UserDevice.
 * @param {string[]} userIds
 * @returns {Promise<Map<string, string[]>>} map userId → token[]
 */
const getFcmTokensByUserIds = async (userIds) => {
    if (!userIds || userIds.length === 0) return new Map()

    const devices = await prisma.userDevice.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, fcmToken: true },
    })

    const tokenMap = new Map()
    for (const d of devices) {
        if (!d.fcmToken || d.fcmToken.trim().length === 0) continue
        if (!tokenMap.has(d.userId)) {
            tokenMap.set(d.userId, [])
        }
        tokenMap.get(d.userId).push(d.fcmToken)
    }
    return tokenMap
}

/**
 * Xoá các FCM token không hợp lệ (expired, unregistered) khỏi DB.
 * @param {string[]} invalidTokens
 */
const removeInvalidTokens = async (invalidTokens) => {
    if (!invalidTokens || invalidTokens.length === 0) return

    try {
        await prisma.userDevice.updateMany({
            where: { fcmToken: { in: invalidTokens } },
            data: { fcmToken: null },
        })
    } catch (error) {
        console.error('[FCM] Failed to remove invalid tokens:', error.message)
    }
}

/**
 * Kiểm tra xem lỗi FCM có phải là token không hợp lệ hay không.
 */
const isInvalidTokenError = (errorCode) => {
    const invalidCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
        'messaging/invalid-argument',
    ]
    return invalidCodes.includes(errorCode)
}

// ───────────────────────────────────────────
//  Tạo in-app notification + publish qua PubSub
// ───────────────────────────────────────────

/**
 * Tạo notification record trong DB + publish qua WebSocket (PubSub).
 *
 * @param {Object} params
 * @param {string} params.userId - user nhận
 * @param {string} params.title
 * @param {string} params.content
 * @param {string} [params.type='SYSTEM'] - NotificationType enum
 * @param {string|null} [params.refType] - loại tham chiếu (LEAVE_REQUEST, OVERTIME_REQUEST, ATTENDANCE, ...)
 * @param {string|null} [params.refId] - ID bản ghi tham chiếu
 * @returns {Promise<Object>} notification record
 */
const createInAppNotification = async ({
    userId,
    title,
    content,
    type = 'SYSTEM',
    refType = null,
    refId = null,
}) => {
    try {
        const notification = await prisma.notification.create({
            data: { userId, title, content, type, refType, refId },
        })

        // Publish qua WebSocket
        pubsub.publish(`${EVENTS.NOTIFICATION_RECEIVED}:${userId}`, {
            userReceivedNotification: {
                status: 'success',
                code: 200,
                message: 'Bạn có thông báo mới',
                data: notification,
            },
        })

        return notification
    } catch (error) {
        console.error('[FCM] Failed to create in-app notification:', error.message)
        return null
    }
}

// ───────────────────────────────────────────
//  Gửi FCM push notification
// ───────────────────────────────────────────

/**
 * Gửi push notification tới 1 user (tất cả thiết bị) + tạo in-app notification.
 *
 * @param {string} userId - user nhận notification
 * @param {Object} message - nội dung notification
 * @param {string} message.title - tiêu đề
 * @param {string} message.body - nội dung
 * @param {Object} [message.data] - dữ liệu bổ sung (key-value string) gửi kèm push
 * @param {Object} [notificationMeta] - metadata cho in-app notification
 * @param {string} [notificationMeta.type='SYSTEM'] - NotificationType
 * @param {string|null} [notificationMeta.refType] - loại tham chiếu
 * @param {string|null} [notificationMeta.refId] - ID bản ghi tham chiếu
 */
const sendToUser = async (userId, message, notificationMeta = {}) => {
    if (!userId || !message?.title) return

    // 1. Tạo in-app notification
    await createInAppNotification({
        userId,
        title: message.title,
        content: message.body || message.title,
        type: notificationMeta.type || 'SYSTEM',
        refType: notificationMeta.refType || null,
        refId: notificationMeta.refId || null,
    })

    // 2. Gửi FCM push
    try {
        const deviceTokens = await getFcmTokensByUserId(userId)
        if (deviceTokens.length === 0) return

        const tokens = deviceTokens.map((d) => d.token)
        const invalidTokens = []

        // Chuẩn bị data payload (FCM chỉ chấp nhận string values)
        const dataPayload = {}
        if (message.data) {
            for (const [key, value] of Object.entries(message.data)) {
                dataPayload[key] = value != null ? String(value) : ''
            }
        }

        const fcmMessage = {
            notification: {
                title: message.title,
                body: message.body || '',
            },
            data: dataPayload,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        }

        // Gửi tới từng token (multicast)
        const sendResults = await Promise.allSettled(
            tokens.map((token) =>
                admin.messaging().send({ ...fcmMessage, token }),
            ),
        )

        // Xử lý kết quả
        sendResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                const errorCode = result.reason?.errorInfo?.code || result.reason?.code
                console.warn(`[FCM] Send failed for token ${tokens[index]?.substring(0, 20)}...: ${errorCode}`)

                if (isInvalidTokenError(errorCode)) {
                    invalidTokens.push(tokens[index])
                }
            }
        })

        // Xoá token không hợp lệ
        if (invalidTokens.length > 0) {
            await removeInvalidTokens(invalidTokens)
        }
    } catch (error) {
        console.error(`[FCM] sendToUser(${userId}) error:`, error.message)
    }
}

/**
 * Gửi push notification tới nhiều user + tạo in-app notification cho mỗi user.
 *
 * @param {string[]} userIds - danh sách user nhận
 * @param {Object} message - nội dung (giống sendToUser)
 * @param {Object} [notificationMeta] - metadata cho in-app notification
 */
const sendToUsers = async (userIds, message, notificationMeta = {}) => {
    if (!userIds || userIds.length === 0 || !message?.title) return

    // Loại bỏ trùng
    const uniqueUserIds = [...new Set(userIds)]

    // 1. Tạo in-app notification cho tất cả users (batch)
    await Promise.allSettled(
        uniqueUserIds.map((userId) =>
            createInAppNotification({
                userId,
                title: message.title,
                content: message.body || message.title,
                type: notificationMeta.type || 'SYSTEM',
                refType: notificationMeta.refType || null,
                refId: notificationMeta.refId || null,
            }),
        ),
    )

    // 2. Lấy tất cả FCM tokens
    try {
        const tokenMap = await getFcmTokensByUserIds(uniqueUserIds)
        const allTokens = []
        for (const tokens of tokenMap.values()) {
            allTokens.push(...tokens)
        }
        if (allTokens.length === 0) return

        // Chuẩn bị data payload
        const dataPayload = {}
        if (message.data) {
            for (const [key, value] of Object.entries(message.data)) {
                dataPayload[key] = value != null ? String(value) : ''
            }
        }

        const fcmMessage = {
            notification: {
                title: message.title,
                body: message.body || '',
            },
            data: dataPayload,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        }

        // Gửi tới từng token
        const invalidTokens = []
        const sendResults = await Promise.allSettled(
            allTokens.map((token) =>
                admin.messaging().send({ ...fcmMessage, token }),
            ),
        )

        sendResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                const errorCode = result.reason?.errorInfo?.code || result.reason?.code
                if (isInvalidTokenError(errorCode)) {
                    invalidTokens.push(allTokens[index])
                }
            }
        })

        if (invalidTokens.length > 0) {
            await removeInvalidTokens(invalidTokens)
        }
    } catch (error) {
        console.error('[FCM] sendToUsers error:', error.message)
    }
}

/**
 * Gửi push notification tới tất cả thiết bị (broadcast / topic).
 * Dùng Firebase topic, user cần subscribe topic trước.
 *
 * @param {string} topic - tên topic (ví dụ: 'all', 'admin', 'employee')
 * @param {Object} message - nội dung
 */
const sendToTopic = async (topic, message) => {
    if (!topic || !message?.title) return

    try {
        const dataPayload = {}
        if (message.data) {
            for (const [key, value] of Object.entries(message.data)) {
                dataPayload[key] = value != null ? String(value) : ''
            }
        }

        await admin.messaging().send({
            topic,
            notification: {
                title: message.title,
                body: message.body || '',
            },
            data: dataPayload,
            android: {
                priority: 'high',
                notification: { sound: 'default', channelId: 'default' },
            },
            apns: {
                payload: { aps: { sound: 'default', badge: 1 } },
            },
        })
    } catch (error) {
        console.error(`[FCM] sendToTopic(${topic}) error:`, error.message)
    }
}

/**
 * Gửi push notification tới tất cả các manager của một dự án.
 *
 * @param {string} jobId - ID dự án
 * @param {Object} message - nội dung
 * @param {Object} [notificationMeta] - metadata cho in-app notification
 */
const notifyJobManagers = async (jobId, message, notificationMeta = {}) => {
    if (!jobId || !message?.title) return

    try {
        const managers = await prisma.jobManager.findMany({
            where: { jobId },
            select: { userId: true },
        })
        const managerIds = managers.map((m) => m.userId)

        if (managerIds.length > 0) {
            await sendToUsers(managerIds, message, notificationMeta)
        }
    } catch (error) {
        console.error(`[FCM] notifyJobManagers(${jobId}) error:`, error.message)
    }
}

export default {
    sendToUser,
    sendToUsers,
    sendToTopic,
    createInAppNotification,
    getFcmTokensByUserId,
    getFcmTokensByUserIds,
    notifyJobManagers,
}
