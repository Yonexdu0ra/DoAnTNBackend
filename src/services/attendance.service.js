import prisma from '../configs/prismaClient.js'
import { invalidateCache } from '../utils/redisCache.js'
import { buildPagePaginationArgs, buildCursorPaginationArgs, processCursorResult } from '../utils/pagination.js'
import { verifyManagerOfJob } from './job.service.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { decryptAES } from '../utils/aes.js'

/**
 * Tính khoảng cách GPS (Haversine formula) - trả về mét
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000
    const toRad = (deg) => deg * (Math.PI / 180)
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Danh sách attendance theo job (manager)
 */
const getAttendancesByJob = async (managerId, jobId, pagination, orderBy, search, select = {}) => {
    await verifyManagerOfJob(managerId, jobId)

    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search, { jobId })

    return prisma.attendance.findMany({
        ...paginationArgs,
        ...select,
    })
}

/**
 * Danh sách attendance theo khoảng thời gian (employee)
 */
const getAttendancesByEmployeeByTime = async (userId, startDate, endDate, select = {}) => {
    const where = { userId }
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) }
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) }

    return prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
        ...select,
    })
}

/**
 * Danh sách attendance của employee (cursor)
 */
const getAttendancesByEmployees = async (userId, pagination, orderBy, search, select = {}) => {
    const limit = pagination?.limit || 10
    const paginationArgs = buildCursorPaginationArgs(pagination, orderBy, search, { userId })

    const attendances = await prisma.attendance.findMany({
        ...paginationArgs,
        ...select.select?.data ? { select: select.select.data.select } : {},
    })

    return processCursorResult(attendances, limit)
}

/**
 * Chấm công (check-in/check-out) cho employee
 */
const createAttendance = async (userId, input) => {
    const { jobId, deviceId, platform, deviceName, ipAddress, code, latitude, longitude, type } = input

    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Bạn không thuộc công việc này')

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Công việc không tồn tại')

    const decryptedCode = decryptAES(code)
    if (!decryptedCode) throw new Error('Mã QR không hợp lệ')

    const distance = calculateDistance(latitude, longitude, job.latitude, job.longitude)
    const isFraud = distance > job.radius
    const fraudReason = isFraud ? `Khoảng cách ${Math.round(distance)}m vượt quá bán kính ${job.radius}m` : null

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const meta = {
        deviceId, platform, deviceName, ipAddress,
        latitude, longitude,
        distance: Math.round(distance),
        qrCode: decryptedCode,
        timestamp: now.toISOString(),
    }

    // Xử lý thiết bị
    const existingDevice = await prisma.userDevice.findFirst({ where: { userId, deviceId } })
    if (existingDevice) {
        await prisma.userDevice.update({
            where: { id: existingDevice.id },
            data: { platform, deviceName: deviceName || 'Unknown Device', ipAddress },
        })
    } else {
        await prisma.userDevice.create({
            data: { userId, deviceId, platform, deviceName: deviceName || 'Unknown Device', ipAddress },
        })
    }

    if (type === 'checkin') {
        const existingAttendance = await prisma.attendance.findFirst({
            where: { userId, jobId, date: today },
        })
        if (existingAttendance) throw new Error('Bạn đã chấm công vào hôm nay')

        const workStart = new Date(job.workStartTime)
        const checkInMinutes = now.getHours() * 60 + now.getMinutes()
        const workStartMinutes = workStart.getHours() * 60 + workStart.getMinutes()
        const lateMinutes = checkInMinutes - workStartMinutes

        let attendanceType = 'PRESENT'
        if (lateMinutes > (job.lateCheckInMinutes || 15)) attendanceType = 'LATE'

        const attendance = await prisma.attendance.create({
            data: {
                userId, jobId, date: today,
                type: attendanceType, checkInAt: now,
                checkInMeta: meta, isFraud, fraudReason,
                status: 'PENDING',
            },
            include: { user: true, job: true },
        })

        await invalidateCache('stats:*')
        await pubsub.publish(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId), attendance)

        return { attendance, isFraud, fraudReason }
    } else if (type === 'checkout') {
        const attendance = await prisma.attendance.findFirst({
            where: { userId, jobId, date: today },
        })
        if (!attendance) throw new Error('Bạn chưa chấm công vào hôm nay')
        if (attendance.checkOutAt) throw new Error('Bạn đã chấm công ra hôm nay')

        const workEnd = new Date(job.workEndTime)
        const checkOutMinutes = now.getHours() * 60 + now.getMinutes()
        const workEndMinutes = workEnd.getHours() * 60 + workEnd.getMinutes()
        const earlyMinutes = workEndMinutes - checkOutMinutes

        let updatedType = attendance.type
        if (earlyMinutes > (job.earlyCheckOutMinutes || 15)) {
            updatedType = attendance.type === 'LATE' ? 'LATE_AND_EARLY' : 'EARLY_LEAVE'
        }

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutAt: now, checkOutMeta: meta,
                type: updatedType,
                ...(isFraud && { isFraud: true, fraudReason }),
            },
            include: { user: true, job: true },
        })

        await invalidateCache('stats:*')
        await pubsub.publish(EVENTS.ATTENDANCE_UPDATED(userId, jobId), updated)

        return { attendance: updated, isFraud, fraudReason }
    } else {
        throw new Error('Loại chấm công không hợp lệ. Chỉ chấp nhận: checkin, checkout')
    }
}

/**
 * Tạo attendance thủ công (manager)
 */
const createManualAttendance = async (managerId, input) => {
    const { jobId, userId, date, type } = input
    await verifyManagerOfJob(managerId, jobId)

    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Nhân viên không thuộc công việc này')

    const attendance = await prisma.attendance.create({
        data: {
            userId, jobId,
            date: new Date(date), type,
            status: 'APPROVED',
            checkInMeta: { manual: true, createdBy: managerId },
        },
        include: { user: true, job: true },
    })

    await invalidateCache('stats:*')
    return attendance
}

/**
 * Review fraud attendance (manager)
 */
const reviewFraudAttendance = async (managerId, input) => {
    const { id, isFraud, fraudReason } = input

    const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: { job: true },
    })
    if (!attendance) throw new Error('Bản ghi chấm công không tồn tại')

    await verifyManagerOfJob(managerId, attendance.jobId)

    const updated = await prisma.attendance.update({
        where: { id },
        data: {
            isFraud,
            fraudReason: isFraud ? fraudReason : null,
        },
        include: { user: true, job: true },
    })

    await invalidateCache('stats:*')
    return updated
}

export default {
    getAttendancesByJob,
    getAttendancesByEmployeeByTime,
    getAttendancesByEmployees,
    createAttendance,
    createManualAttendance,
    reviewFraudAttendance,
}
