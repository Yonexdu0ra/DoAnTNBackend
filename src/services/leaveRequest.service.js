import prisma from '../configs/prismaClient.js'
import { invalidateCache } from '../utils/redisCache.js'
import { buildPagePaginationArgs, buildCursorPaginationArgs, processCursorResult } from '../utils/pagination.js'
import { verifyManagerOfJob } from './job.service.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import notificationService from './notification.service.js'

/**
 * Danh sách đơn xin nghỉ theo job (manager)
 */
const getLeaveRequestsByJob = async (managerId, jobId, pagination, orderBy, search, select = {}) => {
    await verifyManagerOfJob(managerId, jobId)

    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search, { jobId })

    const [data, total] = await Promise.all([
        prisma.leaveRequest.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.leaveRequest.count({ where: paginationArgs.where }),
    ])

    return { data, total }
}

/**
 * Danh sách đơn xin nghỉ của employee (cursor)
 */
const getLeaveRequestsByEmployee = async (userId, pagination, orderBy, search, select = {}) => {
    const limit = pagination?.limit || 10
    const paginationArgs = buildCursorPaginationArgs(pagination, orderBy, search, { userId })

    const leaveRequests = await prisma.leaveRequest.findMany({
        ...paginationArgs,
        ...select.select?.data ? { select: select.select.data.select } : {},
    })

    return processCursorResult(leaveRequests, limit)
}

/**
 * Phê duyệt / từ chối đơn xin nghỉ (manager)
 */
const reviewLeaveRequest = async (id, status, reply, managerId) => {
    const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { job: true, user: true },
    })
    if (!leaveRequest) throw new Error('Đơn xin nghỉ không tồn tại')

    await verifyManagerOfJob(managerId, leaveRequest.jobId)

    if (leaveRequest.status !== 'PENDING') {
        throw new Error('Đơn xin nghỉ đã được xử lý')
    }

    const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
            status,
            reply,
            approvedBy: managerId,
            approverAt: new Date(),
        },
        include: { user: true, job: true, approver: true },
    })

    await invalidateCache('stats:*')
    await pubsub.publish(EVENTS.LEAVE_REQUEST_UPDATED(leaveRequest.jobId), updated)

    const statusText = status === 'APPROVED' ? 'được duyệt' : 'bị từ chối'
    await notificationService.createAndPublish(
        leaveRequest.userId,
        `Đơn xin nghỉ ${statusText}`,
        reply || `Đơn xin nghỉ của bạn đã ${statusText}`,
        'APPROVAL', 'LEAVE', id
    )

    return updated
}

/**
 * Tạo đơn xin nghỉ (employee)
 */
const createLeaveRequest = async (userId, jobId, input) => {
    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Bạn không thuộc công việc này')

    const existingRequest = await prisma.leaveRequest.findFirst({
        where: {
            userId, jobId, status: 'PENDING',
            OR: [{
                startDate: { lte: new Date(input.endDate) },
                endDate: { gte: new Date(input.startDate) },
            }],
        },
    })
    if (existingRequest) throw new Error('Đã có đơn xin nghỉ trong khoảng thời gian này đang chờ duyệt')

    const leaveRequest = await prisma.leaveRequest.create({
        data: {
            userId, jobId,
            leaveType: input.leaveType,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            reason: input.reason,
            status: 'PENDING',
        },
        include: { user: true, job: true },
    })

    await invalidateCache('stats:*')
    await pubsub.publish(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(jobId), leaveRequest)

    // Notify managers
    const managers = await prisma.jobManager.findMany({
        where: { jobId },
        select: { userId: true },
    })
    for (const manager of managers) {
        await notificationService.createAndPublish(
            manager.userId, 'Có đơn xin nghỉ mới',
            `Nhân viên yêu cầu xin nghỉ từ ${input.startDate} đến ${input.endDate}`,
            'LEAVE', 'LEAVE', leaveRequest.id
        )
    }

    return leaveRequest
}

/**
 * Tạo đơn xin nghỉ thủ công (manager, đã duyệt)
 */
const createManualLeaveRequest = async (managerId, input) => {
    const { jobId, userId, leaveType, startDate, endDate, reason } = input
    await verifyManagerOfJob(managerId, jobId)

    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { jobId, userId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Nhân viên không thuộc công việc này')

    const leaveRequest = await prisma.leaveRequest.create({
        data: {
            userId, jobId, leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            status: 'APPROVED',
            approvedBy: managerId,
            approverAt: new Date(),
        },
        include: { user: true, job: true, approver: true },
    })

    await invalidateCache('stats:*')
    return leaveRequest
}

export default {
    getLeaveRequestsByJob,
    getLeaveRequestsByEmployee,
    reviewLeaveRequest,
    createLeaveRequest,
    createManualLeaveRequest,
}
