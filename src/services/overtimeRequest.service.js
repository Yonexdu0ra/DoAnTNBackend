import prisma from '../configs/prismaClient.js'
import { invalidateCache } from '../utils/redisCache.js'
import { buildPagePaginationArgs, buildCursorPaginationArgs, processCursorResult } from '../utils/pagination.js'
import { verifyManagerOfJob } from './job.service.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import notificationService from './notification.service.js'

/**
 * Danh sách đơn xin OT theo job (manager)
 */
const getOvertimeRequestsByJob = async (managerId, jobId, pagination, orderBy, search, select = {}) => {
    await verifyManagerOfJob(managerId, jobId)

    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search, { jobId })

    const [data, total] = await Promise.all([
        prisma.overtimeRequest.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.overtimeRequest.count({ where: paginationArgs.where }),
    ])

    return { data, total }
}

/**
 * Danh sách đơn xin OT của employee (cursor)
 */
const getOvertimeRequestsByEmployee = async (userId, pagination, orderBy, search, select = {}) => {
    const limit = pagination?.limit || 10
    const paginationArgs = buildCursorPaginationArgs(pagination, orderBy, search, { userId })

    const overtimeRequests = await prisma.overtimeRequest.findMany({
        ...paginationArgs,
        ...select.select?.data ? { select: select.select.data.select } : {},
    })

    return processCursorResult(overtimeRequests, limit)
}

/**
 * Phê duyệt / từ chối đơn OT (manager)
 */
const reviewOvertimeRequest = async (id, status, reply, managerId) => {
    const overtimeRequest = await prisma.overtimeRequest.findUnique({
        where: { id },
        include: { job: true, user: true },
    })
    if (!overtimeRequest) throw new Error('Đơn xin làm thêm không tồn tại')

    await verifyManagerOfJob(managerId, overtimeRequest.jobId)

    if (overtimeRequest.status !== 'PENDING') {
        throw new Error('Đơn xin làm thêm đã được xử lý')
    }

    const updated = await prisma.overtimeRequest.update({
        where: { id },
        data: {
            status, reply,
            approvedBy: managerId,
            approverAt: new Date(),
        },
        include: { user: true, job: true, approver: true },
    })

    await invalidateCache('stats:*')
    await pubsub.publish(EVENTS.OVERTIME_REQUEST_UPDATED(overtimeRequest.jobId), updated)

    const statusText = status === 'APPROVED' ? 'được duyệt' : 'bị từ chối'
    await notificationService.createAndPublish(
        overtimeRequest.userId,
        `Đơn xin làm thêm ${statusText}`,
        reply || `Đơn xin làm thêm của bạn đã ${statusText}`,
        'APPROVAL', 'OVERTIME', id
    )

    return updated
}

/**
 * Tạo đơn xin OT (employee)
 */
const createOvertimeRequest = async (userId, jobId, input) => {
    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Bạn không thuộc công việc này')

    const start = new Date(input.startTime)
    const end = new Date(input.endTime)
    const minutes = Math.round((end - start) / (1000 * 60))
    if (minutes <= 0) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu')

    const overtimeRequest = await prisma.overtimeRequest.create({
        data: {
            userId, jobId,
            date: new Date(input.date),
            startTime: start, endTime: end,
            minutes, reason: input.reason,
            status: 'PENDING',
        },
        include: { user: true, job: true },
    })

    await invalidateCache('stats:*')
    await pubsub.publish(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(jobId), overtimeRequest)

    const managers = await prisma.jobManager.findMany({
        where: { jobId },
        select: { userId: true },
    })
    for (const manager of managers) {
        await notificationService.createAndPublish(
            manager.userId, 'Có đơn xin làm thêm mới',
            `Nhân viên yêu cầu làm thêm ${minutes} phút vào ngày ${input.date}`,
            'OVERTIME', 'OVERTIME', overtimeRequest.id
        )
    }

    return overtimeRequest
}

/**
 * Tạo đơn OT thủ công (manager, đã duyệt)
 */
const createManualOvertimeRequest = async (managerId, input) => {
    const { jobId, userId, date, startTime, endTime, reason } = input
    await verifyManagerOfJob(managerId, jobId)

    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Nhân viên không thuộc công việc này')

    const start = new Date(startTime)
    const end = new Date(endTime)
    const minutes = Math.round((end - start) / (1000 * 60))
    if (minutes <= 0) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu')

    const overtimeRequest = await prisma.overtimeRequest.create({
        data: {
            userId, jobId,
            date: new Date(date),
            startTime: start, endTime: end,
            minutes, reason,
            status: 'APPROVED',
            approvedBy: managerId,
            approverAt: new Date(),
        },
        include: { user: true, job: true, approver: true },
    })

    await invalidateCache('stats:*')
    return overtimeRequest
}

export default {
    getOvertimeRequestsByJob,
    getOvertimeRequestsByEmployee,
    reviewOvertimeRequest,
    createOvertimeRequest,
    createManualOvertimeRequest,
}
