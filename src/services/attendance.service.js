// ═══════════════════════════════════════════
//  Attendance Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { decryptAES } from '../utils/aes.js'
import {
    buildCursorPaginationArgs,
    buildCursorPageInfo,
    processCursorResult,
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'
import fcmService from './fcm.services.js'
import { isManagerOfJob, isAdmin, ensureJobManagementAccess, hasRecordAccess, ensureUserJoinedJob } from '../utils/permission.js'
import { calculateDistance } from '../utils/location.js'

// ── Filter options ──
const ATTENDANCE_FILTER_OPTIONS = {
    keywordFields: ['user.profile.fullName', 'user.email', 'user.code'],
    inFieldMap: {
        typeIn: 'type',
    },
}

// ── Helpers ──



/**
 * Xác định AttendanceType dựa trên thời gian check-in/check-out so với job config.
 */
const determineAttendanceType = (checkTime, job, isCheckIn) => {
    if (!job) return 'PRESENT'

    const now = new Date(checkTime)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    if (isCheckIn) {
        const workStart = new Date(job.workStartTime)
        const startMinutes = workStart.getHours() * 60 + workStart.getMinutes()
        const lateThreshold = startMinutes + (job.lateCheckInMinutes || 15)

        if (nowMinutes > lateThreshold) return 'LATE'
        return 'PRESENT'
    } else {
        const workEnd = new Date(job.workEndTime)
        const endMinutes = workEnd.getHours() * 60 + workEnd.getMinutes()
        const earlyThreshold = endMinutes - (job.earlyCheckOutMinutes || 15)

        if (nowMinutes < earlyThreshold) return 'EARLY_LEAVE'
        return 'PRESENT'
    }
}

/**
 * Kết hợp type check-in và check-out thành type cuối cùng.
 */
const combineAttendanceType = (checkInType, checkOutType) => {
    if (checkInType === 'LATE' && checkOutType === 'EARLY_LEAVE') return 'LATE_AND_EARLY'
    if (checkInType === 'LATE') return 'LATE'
    if (checkOutType === 'EARLY_LEAVE') return 'EARLY_LEAVE'
    return 'PRESENT'
}

// ═══════════════════════════════════════════
//  QUERY
// ═══════════════════════════════════════════

/**
 * Lấy attendance theo ID.
 * Kiểm tra quyền: chủ sở hữu / manager job / admin.
 *
 * @returns {Promise<AttendanceResponse>}
 */
const getAttendanceById = async (id, userId, select) => {
    if (!id) throw new Error('Thiếu ID chấm công')

    // Luôn cần userId, jobId để kiểm tra quyền
    const attendance = await prisma.attendance.findUnique({
        where: { id },
        ...(select ? { select: { ...select, userId: true, jobId: true } } : {}),
    })

    if (!attendance) {
        throw new Error('Không tìm thấy bản ghi chấm công')
    }

    if (!(await hasRecordAccess(userId, attendance.userId, attendance.jobId))) {
        throw new Error('Bạn không có quyền xem bản ghi chấm công này')
    }

    return attendance
}

/**
 * Lấy danh sách attendance của employee theo khoảng thời gian (không phân trang).
 * Dùng cho calendar view (hiển thị từ đầu tháng → cuối tháng).
 *
 * @returns {Promise<AttendanceListResponse>}
 */
const getAttendancesByEmployeeByTime = async (userId, startDate, endDate, filter, select) => {
    if (!startDate || !endDate) {
        throw new Error('Thiếu khoảng thời gian (startDate, endDate)')
    }

    const filterWhere = buildPrismaFilter(filter, ATTENDANCE_FILTER_OPTIONS)

    const findArgs = {
        where: {
            ...filterWhere,
            userId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        },
        orderBy: { date: 'asc' },
    }

    if (select) findArgs.select = select

    const items = await prisma.attendance.findMany(findArgs)

    return {
        nodes: items,
        pageInfo: {
            page: 1,
            limit: items.length,
            total: items.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        },
    }
}

/**
 * Lấy danh sách attendance của employee (cursor-based pagination).
 * Dùng cho mobile list view.
 *
 * @returns {Promise<AttendanceCursorListResponse>}
 */
const getAttendancesByEmployee = async (userId, pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, ATTENDANCE_FILTER_OPTIONS)
    const extraWhere = { ...filterWhere, userId }

    const findArgs = buildCursorPaginationArgs(pagination, orderBy, select, extraWhere)
    const items = await prisma.attendance.findMany(findArgs)

    const limit = pagination?.limit
    const { data, nextCursor } = processCursorResult(items, limit)
    const pageInfo = buildCursorPageInfo(limit, nextCursor)

    return {
        data,
        pageInfo: pageInfo,
    }
}

/**
 * Lấy danh sách attendance theo job (page-based pagination).
 * Dùng cho manager xem chấm công của nhân viên trong job.
 *
 * @returns {Promise<AttendanceListResponse>}
 */
const getAttendancesByJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const filterWhere = buildPrismaFilter(filter, ATTENDANCE_FILTER_OPTIONS)
    const extraWhere = { ...filterWhere, jobId }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)
    const [items, total] = await Promise.all([
        prisma.attendance.findMany(findArgs),
        prisma.attendance.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ═══════════════════════════════════════════
//  MUTATION
// ═══════════════════════════════════════════

/**
 * Chấm công bằng QR Code.
 * Flow:
 * 1. Giải mã QR → { jobId, timeBase, expireAt }
 * 2. Kiểm tra hợp lệ (chưa expired, user thuộc job, trong bán kính)
 * 3. Nếu chưa có check-in hôm nay → tạo attendance mới (check-in)
 * 4. Nếu đã check-in rồi → cập nhật check-out
 *
 * @param {string} userId
 * @param {Object} input - { qrCodeData, latitude, longitude, deviceId }
 * @returns {Promise<AttendanceResponse>}
 */
const attendanceByQRCode = async (userId, input) => {
    const { qrCodeData, latitude, longitude, deviceId, ipAddress } = input

    // 1. Giải mã QR
    const decrypted = decryptAES(qrCodeData)
    if (!decrypted) throw new Error('Mã QR không hợp lệ')

    let qrPayload
    try {
        qrPayload = JSON.parse(decrypted)
    } catch {
        throw new Error('Mã QR không đúng định dạng')
    }

    const { jobId, expireAt, type: qrType } = qrPayload

    if (!jobId) throw new Error('Mã QR không chứa thông tin công việc')

    // 2. Kiểm tra hết hạn
    if (new Date() > new Date(expireAt)) {
        throw new Error('Mã QR đã hết hạn')
    }

    // 3. Kiểm tra user thuộc job (đã được duyệt)
    await ensureUserJoinedJob(userId, jobId, 'Bạn không thuộc công việc này hoặc chưa được duyệt')

    // 4. Kiểm tra vị trí (bán kính cho phép)
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Không tìm thấy công việc')

    const distance = calculateDistance(latitude, longitude, job.latitude, job.longitude)
    const isFraud = distance > job.radius

    const now = new Date()

    // 5. Build metadata (theo cấu trúc AttendanceMeta trong schema)
    const meta = {
        ipAddress,
        deviceId,
        latitude,
        longitude,
        attendanceWith: 'SCAN_QR',
        distance: Math.round(distance),
        attendanceAt: now,
    }
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 6. Tìm attendance hôm nay
    const existingAttendance = await prisma.attendance.findFirst({
        where: {
            userId,
            jobId,
            date: todayStart,
        },
    })

    let attendance

    if (qrType === 'UNKNOWN') {
        throw new Error('Mã QR hiện tại không nằm trong thời gian quét hợp lệ (ngoài giờ làm việc).')
    }

    if (qrType === 'CHECKIN' || !existingAttendance) {
        if (qrType === 'CHECKIN' && existingAttendance) {
            throw new Error('Bạn đã chấm công check-in cho ca này rồi.')
        }
        // ── Check-in ──
        const checkInType = determineAttendanceType(now, job, true)

        attendance = await prisma.attendance.create({
            data: {
                date: todayStart,
                type: checkInType,
                status: 'APPROVED',
                isFraud,
                fraudReason: isFraud ? `Khoảng cách ${Math.round(distance)}m vượt bán kính ${job.radius}m` : null,
                checkInAt: now,
                checkInMeta: meta,
                userId,
                jobId,
            },
        })
    } else if (qrType === 'CHECKOUT' || existingAttendance) {
        // ── Check-out ──
        if (qrType === 'CHECKOUT' && !existingAttendance) {
            throw new Error('Bạn chưa check-in nên không thể check-out.')
        }
        if (existingAttendance.checkOutAt) {
            throw new Error('Bạn đã chấm công đầy đủ hôm nay')
        }

        const checkOutType = determineAttendanceType(now, job, false)
        const finalType = combineAttendanceType(existingAttendance.type, checkOutType)

        const updateFraud = isFraud || existingAttendance.isFraud
        let fraudReason = existingAttendance.fraudReason || ''
        if (isFraud) {
            const outFraudMsg = `Check-out: khoảng cách ${Math.round(distance)}m vượt bán kính ${job.radius}m`
            fraudReason = fraudReason ? `${fraudReason}; ${outFraudMsg}` : outFraudMsg
        }

        attendance = await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
                type: finalType,
                checkOutAt: now,
                checkOutMeta: meta,
                isFraud: updateFraud,
                fraudReason: updateFraud ? fraudReason : null,
            },
        })
    }

    // 7. Publish qua WebSocket cho manager
    pubsub.publish(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId), {
        managerReceivedAttendance: attendance,
    })

    // 8. Publish qua WebSocket cho employee
    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(userId), {
        employeeReceivedAttendanceStatus: attendance,
    })

    return attendance
}

/**
 * Manager phê duyệt / từ chối trạng thái gian lận chấm công.
 *
 * @param {Object} input - { attendanceId, isFraud, fraudReason }
 * @param {string} approverUserId
 * @returns {Promise<AttendanceResponse>}
 */
const reviewAttendanceFraud = async (input, approverUserId) => {
    const { attendanceId, isFraud, fraudReason } = input

    if (!attendanceId) throw new Error('Thiếu ID chấm công')

    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
    })

    if (!attendance) throw new Error('Không tìm thấy bản ghi chấm công')

    // Kiểm tra quyền: manager của job hoặc admin
    await ensureJobManagementAccess(approverUserId, attendance.jobId, 'Bạn không có quyền phê duyệt chấm công này')

    const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            isFraud,
            fraudReason: isFraud ? (fraudReason || attendance.fraudReason) : null,
        },
    })

    // Thông báo cho employee
    fcmService.sendToUser(attendance.userId, {
        title: 'Cập nhật chấm công',
        body: isFraud
            ? `Chấm công ngày ${attendance.date.toISOString().slice(0, 10)} được đánh dấu gian lận`
            : `Chấm công ngày ${attendance.date.toISOString().slice(0, 10)} đã được xác nhận hợp lệ`,
    }, {
        type: 'APPROVAL',
        refType: 'ATTENDANCE',
        refId: attendanceId,
    })

    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(attendance.userId), {
        employeeReceivedAttendanceStatus: updated,
    })

    pubsub.publish(EVENTS.NEW_ATTENDANCE_BY_JOB(attendance.jobId), {
        managerReceivedAttendance: updated,
    })

    return updated
}

/**
 * Manager đánh dấu chấm công gian lận theo job.
 *
 * @param {Object} input - { jobId, attendanceId, fraudReason }
 * @param {string} approverUserId
 * @returns {Promise<AttendanceResponse>}
 */
const markAttendanceAsFraudByJob = async (input, approverUserId) => {
    const { jobId, attendanceId, fraudReason } = input

    if (!jobId || !attendanceId) throw new Error('Thiếu thông tin (jobId, attendanceId)')

    // Kiểm tra quyền: manager của job hoặc admin
    await ensureJobManagementAccess(approverUserId, jobId, 'Bạn không có quyền thao tác trên công việc này')

    const attendance = await prisma.attendance.findFirst({
        where: { id: attendanceId, jobId },
    })

    if (!attendance) {
        throw new Error('Không tìm thấy bản ghi chấm công trong công việc này')
    }

    const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            isFraud: true,
            fraudReason,
        },
    })

    // Thông báo cho employee
    fcmService.sendToUser(attendance.userId, {
        title: 'Chấm công bị đánh dấu gian lận',
        body: `Chấm công ngày ${attendance.date.toISOString().slice(0, 10)} bị đánh dấu gian lận: ${fraudReason}`,
    }, {
        type: 'APPROVAL',
        refType: 'ATTENDANCE',
        refId: attendanceId,
    })

    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(attendance.userId), {
        employeeReceivedAttendanceStatus: updated,
    })

    pubsub.publish(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId), {
        managerReceivedAttendance: updated,
    })

    return updated
}

/**
 * Manager tạo chấm công bù cho nhân viên (khi quên chấm công, v.v.).
 *
 * @param {Object} actor - context.user { id, role }
 * @param {Object} input - CreateCompensatoryAttendanceForEmployeeInput
 * @returns {Promise<AttendanceResponse>}
 */
const createCompensatoryAttendanceForEmployee = async (actor, input) => {
    const { userId, jobId, date, checkInAt, checkOutAt, isFraud, fraudReason, reason } = input

    if (!userId || !jobId) throw new Error('Thiếu thông tin (userId, jobId)')

    // Kiểm tra quyền: manager của job hoặc admin
    await ensureJobManagementAccess(actor.id, jobId, 'Bạn không có quyền tạo chấm công bù cho công việc này')

    // Kiểm tra user thuộc job
    await ensureUserJoinedJob(userId, jobId, 'Nhân viên không thuộc công việc này')

    // Kiểm tra trùng lặp (đã có attendance cùng ngày, cùng job)
    const attendanceDate = new Date(date)
    const existing = await prisma.attendance.findFirst({
        where: {
            userId,
            jobId,
            date: attendanceDate,
        },
    })

    if (existing) {
        throw new Error('Nhân viên đã có bản ghi chấm công cho ngày này')
    }

    // Xác định type dựa trên thời gian check-in/check-out
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    const checkInType = determineAttendanceType(checkInAt, job, true)
    const checkOutType = checkOutAt ? determineAttendanceType(checkOutAt, job, false) : null
    const finalType = checkOutType ? combineAttendanceType(checkInType, checkOutType) : checkInType

    const attendance = await prisma.attendance.create({
        data: {
            date: attendanceDate,
            type: finalType,
            status: 'APPROVED',
            isFraud: isFraud || false,
            fraudReason: fraudReason || null,
            checkInAt: new Date(checkInAt),
            checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
            checkInMeta: {
                ipAddress: null,
                deviceId: null,
                latitude: null,
                longitude: null,
                attendanceWith: 'COMPENSATORY',
                distance: null,
                attendanceAt: new Date(),
            },
            userId,
            jobId,
        },
    })

    // Thông báo cho employee
    fcmService.sendToUser(userId, {
        title: 'Chấm công bù',
        body: `Bạn được tạo chấm công bù cho ngày ${attendanceDate.toISOString().slice(0, 10)}${reason ? `: ${reason}` : ''}`,
    }, {
        type: 'APPROVAL',
        refType: 'ATTENDANCE',
        refId: attendance.id,
    })

    // Publish cho manager
    pubsub.publish(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId), {
        managerReceivedAttendance: attendance,
    })

    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(userId), {
        employeeReceivedAttendanceStatus: attendance,
    })

    return attendance
}

export default {
    getAttendanceById,
    getAttendancesByEmployeeByTime,
    getAttendancesByEmployee,
    getAttendancesByJob,
    attendanceByQRCode,
    reviewAttendanceFraud,
    markAttendanceAsFraudByJob,
    createCompensatoryAttendanceForEmployee,
}
