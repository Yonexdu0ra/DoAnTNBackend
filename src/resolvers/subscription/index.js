import { pubsub, EVENTS } from '../../configs/pubsub.js'
import prisma from '../../configs/prismaClient.js'
import { nanoid } from 'nanoid'
import { ensureAuthorized, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import { encryptAES } from '../../utils/aes.js'

const DEFAULT_QR_ROTATE_SECONDS = 5
const DEFAULT_QR_EXPIRE_SECONDS = 10
const qrTickerByJob = new Map()

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.floor(parsed)
}

const QR_ROTATE_SECONDS = toPositiveInt(
    process.env.ATTENDANCE_QR_ROTATE_SECONDS,
    DEFAULT_QR_ROTATE_SECONDS,
)
const QR_EXPIRE_SECONDS = toPositiveInt(
    process.env.ATTENDANCE_QR_EXPIRE_SECONDS,
    DEFAULT_QR_EXPIRE_SECONDS,
)
const QR_TYPE = 'ATTENDANCE_JOB'

const buildAttendanceQrResponse = (jobId) => {
    const now = Date.now()
    const expireAtMs = now + QR_EXPIRE_SECONDS * 1000
    const timeBase = now + QR_ROTATE_SECONDS * 1000 // Thời điểm mã QR hiện tại sẽ hết hạn và cần thay bằng mã mới (client có thể dùng timeBase để biết khi nào cần refresh QR mới)

    // qrCodeData trả về string payload để client hiển thị thành QR image.
    const qrPayload = {
        type: QR_TYPE,
        jobId,
        nonce: nanoid(24),
        iat: new Date(now).toISOString(),
        exp: new Date(expireAtMs).toISOString(),
    }
    const encryptedQrPayload = encryptAES(JSON.stringify(qrPayload))
    return {
        status: 'success',
        code: 200,
        expireAt: new Date(expireAtMs),
        timeBase,
        qrCodeData: encryptedQrPayload,
        type: QR_TYPE,
    }
}

const publishAttendanceQrByJob = async (jobId) => {
    await pubsub.publish(EVENTS.ATTENDANCE_QR_CODE_BY_JOB(jobId), {
        managerReceivedAttendanceQRCodeJob: buildAttendanceQrResponse(jobId),
    })
}

const retainAttendanceQrTicker = (jobId) => {
    const existing = qrTickerByJob.get(jobId)
    if (existing) {
        existing.refCount += 1
        return
    }

    const intervalId = setInterval(() => {
        publishAttendanceQrByJob(jobId).catch((err) => {
            console.error('[subscription][managerReceivedAttendanceQRCodeJob] publish error:', err)
        })
    }, QR_ROTATE_SECONDS * 1000)

    qrTickerByJob.set(jobId, { intervalId, refCount: 1 })

    // Bắn ngay 1 mã QR khi client vừa subscribe.
    publishAttendanceQrByJob(jobId).catch((err) => {
        console.error('[subscription][managerReceivedAttendanceQRCodeJob] initial publish error:', err)
    })
}

const releaseAttendanceQrTicker = (jobId) => {
    const existing = qrTickerByJob.get(jobId)
    if (!existing) return

    existing.refCount -= 1
    if (existing.refCount <= 0) {
        clearInterval(existing.intervalId)
        qrTickerByJob.delete(jobId)
    }
}

const subscriptionResolvers = {
    // ═══════════════════════════════════
    // COMMON
    // ═══════════════════════════════════

    userReceivedNotification: {
        subscribe: (_, __, context) => {
            const userId = context.user?.id
            if (!userId) throw new Error('Unauthorized')

            // Trả về async iterator, filter bằng targetUserId trong payload
            const iterator = pubsub.asyncIterator(EVENTS.NOTIFICATION_RECEIVED)

            // Wrap iterator để filter theo userId
            return {
                [Symbol.asyncIterator]() {
                    return {
                        async next() {
                            while (true) {
                                const result = await iterator.next()
                                if (result.done) return result
                                if (result.value?.targetUserId === userId) {
                                    return result
                                }
                            }
                        },
                        return() {
                            return iterator.return()
                        },
                        throw(err) {
                            return iterator.throw(err)
                        },
                    }
                },
            }
        },
    },

    // ═══════════════════════════════════
    // EMPLOYEE SUBSCRIPTIONS
    // ═══════════════════════════════════

    employeeReceivedLeaveRequestStatus: {
        subscribe: (_, __, context) => {
            const userId = context.user?.id
            if (!userId) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.EMPLOYEE_LEAVE_STATUS(userId))
        },
    },

    employeeReceivedOvertimeRequestStatus: {
        subscribe: (_, __, context) => {
            const userId = context.user?.id
            if (!userId) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.EMPLOYEE_OVERTIME_STATUS(userId))
        },
    },

    employeeReceivedAttendanceStatus: {
        subscribe: (_, __, context) => {
            const userId = context.user?.id
            if (!userId) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(userId))
        },
    },

    // ═══════════════════════════════════
    // MANAGER SUBSCRIPTIONS
    // ═══════════════════════════════════

    managerReceivedLeaveRequest: {
        subscribe: (_, { jobId }, context) => {
            if (!context.user?.id) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(jobId))
        },
    },

    managerReceivedOvertimeRequest: {
        subscribe: (_, { jobId }, context) => {
            if (!context.user?.id) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(jobId))
        },
    },

    managerReceivedAttendance: {
        subscribe: (_, { jobId }, context) => {
            if (!context.user?.id) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId))
        },
    },

    managerReceivedUserJoinedJob: {
        subscribe: (_, { jobId }, context) => {
            if (!context.user?.id) throw new Error('Unauthorized')
            return pubsub.asyncIterator(EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId))
        },
    },

    managerReceivedAttendanceQRCodeJob: {
        subscribe: async (_, { jobId }, context) => {
            const userId = context.user?.id
            if (!userId) throw new Error('Unauthorized')

            ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedAttendanceQRCodeJob')
            const isAdmin = context.user.role.includes(ROLE_ACCESS.admin)
            const managerInJob = await prisma.jobManager.findFirst({
                where: {
                    jobId,
                    userId,
                },
                select: { id: true },
            })

            if (!managerInJob && !isAdmin) {
                throw new Error('Bạn không có quyền nhận QR code của công việc này')
            }

            retainAttendanceQrTicker(jobId)
            const iterator = pubsub.asyncIterator(EVENTS.ATTENDANCE_QR_CODE_BY_JOB(jobId))

            return {
                [Symbol.asyncIterator]() {
                    return {
                        next() {
                            return iterator.next()
                        },
                        return() {
                            releaseAttendanceQrTicker(jobId)
                            return iterator.return()
                        },
                        throw(error) {
                            releaseAttendanceQrTicker(jobId)
                            return iterator.throw(error)
                        },
                    }
                },
            }
        },
    },
}

export default subscriptionResolvers
