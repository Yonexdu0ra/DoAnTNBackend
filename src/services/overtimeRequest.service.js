import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildCursorPaginationArgs,
    processCursorResult,
    buildPrismaFilter,
} from '../utils/pagination.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { createAndPublishNotification } from './notification.service.js'

const KEYWORD_FIELDS = ['reason', 'reply']
const IN_FIELD_MAP = { statusIn: 'status' }
const INCLUDE_RELATIONS = {
    user: { include: { profile: true, department: true, position: true } },
    job: true,
    approver: { include: { profile: true, department: true, position: true } },
}

// ── Query: yêu cầu OT của employee (cursor-based) ──
const getOvertimeRequestsByEmployee = async (
    userId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const limit = pagination?.limit || 10
    const args = buildCursorPaginationArgs(pagination, orderBy, null, {
        userId,
        ...filterWhere,
    })

    const items = await prisma.overtimeRequest.findMany({
        ...args,
        ...(select ? { select } : {}),
    })
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách yêu cầu OT thành công',
        data,
        pagination: {
            limit,
            nextCursor,
            hasNextPage: !!nextCursor,
        },
    }
}

// ── Query: yêu cầu OT theo job (manager, page-based) ──
const getOvertimeRequestsByJob = async (
    jobId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        jobId,
        ...filterWhere,
    })

    const [data, total] = await Promise.all([
        prisma.overtimeRequest.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.overtimeRequest.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách yêu cầu OT theo công việc thành công',
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

// ── Mutation: tạo yêu cầu OT (employee) ──
const createOvertimeRequest = async (userId, input) => {
    // Kiểm tra user có trong job không
    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { userId, jobId: input.jobId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Bạn chưa tham gia công việc này')

    // Tính minutes nếu chưa có
    const startTime = new Date(input.startTime)
    const endTime = new Date(input.endTime)
    const minutes = input.minutes || Math.round((endTime - startTime) / 60000)

    const overtimeRequest = await prisma.overtimeRequest.create({
        data: {
            userId,
            jobId: input.jobId,
            date: new Date(input.date),
            startTime,
            endTime,
            minutes,
            reason: input.reason,
            status: 'PENDING',
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho manager
    pubsub.publish(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(input.jobId), {
        managerReceivedOvertimeRequest: {
            status: 'success',
            code: 200,
            message: 'Có yêu cầu OT mới',
            data: overtimeRequest,
        },
    })

    // Tạo notification cho managers
    const jobManagers = await prisma.jobManager.findMany({
        where: { jobId: input.jobId },
        select: { userId: true },
    })
    const employeeName = overtimeRequest.user?.profile?.fullName || 'Nhân viên'
    for (const jm of jobManagers) {
        await createAndPublishNotification({
            userId: jm.userId,
            title: 'Yêu cầu OT mới',
            content: `${employeeName} đã gửi yêu cầu làm thêm giờ (${minutes} phút)`,
            type: 'OVERTIME',
            refType: 'OVERTIME_REQUEST',
            refId: overtimeRequest.id,
        })
    }

    return {
        status: 'success',
        code: 201,
        message: 'Tạo yêu cầu OT thành công',
        data: overtimeRequest,
    }
}

// ── Mutation: huỷ yêu cầu OT (employee) ──
const cancelOvertimeRequest = async (userId, input) => {
    const request = await prisma.overtimeRequest.findFirst({
        where: { id: input.overtimeRequestId, userId },
    })
    if (!request) throw new Error('Yêu cầu OT không tồn tại')
    if (request.status !== 'PENDING') throw new Error('Chỉ có thể huỷ yêu cầu đang chờ duyệt')

    const updated = await prisma.overtimeRequest.update({
        where: { id: input.overtimeRequestId },
        data: {
            status: 'CANCELED',
            reply: input.reason || 'Đã huỷ bởi nhân viên',
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho manager của job để cập nhật table realtime
    pubsub.publish(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(request.jobId), {
        managerReceivedOvertimeRequest: {
            status: 'success',
            code: 200,
            message: 'Yêu cầu OT đã được huỷ bởi nhân viên',
            data: updated,
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Huỷ yêu cầu OT thành công',
        data: updated,
    }
}

// ── Mutation: review yêu cầu OT (manager) ──
const reviewOvertimeRequest = async (approverId, input) => {
    const request = await prisma.overtimeRequest.findUnique({
        where: { id: input.overtimeRequestId },
    })
    if (!request) throw new Error('Yêu cầu OT không tồn tại')
    if (request.status !== 'PENDING') throw new Error('Yêu cầu này đã được xử lý')

    // Kiểm tra manager có quản lý job này không
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: request.jobId, userId: approverId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    const decision = String(input.approve || '').toUpperCase()
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new Error('Trạng thái duyệt không hợp lệ, chỉ chấp nhận APPROVED hoặc REJECTED')
    }

    const isApproved = decision === 'APPROVED'
    const newStatus = isApproved ? 'APPROVED' : 'REJECTED'
    const updated = await prisma.overtimeRequest.update({
        where: { id: input.overtimeRequestId },
        data: {
            status: newStatus,
            reply: input.reply || null,
            approvedBy: approverId,
            approverAt: new Date(),
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho employee
    pubsub.publish(EVENTS.EMPLOYEE_OVERTIME_STATUS(request.userId), {
        employeeReceivedOvertimeRequestStatus: {
            status: 'success',
            code: 200,
            message: isApproved
                ? 'Yêu cầu OT đã được phê duyệt'
                : 'Yêu cầu OT đã bị từ chối',
            data: updated,
        },
    })

    // Tạo notification cho employee
    await createAndPublishNotification({
        userId: request.userId,
        title: isApproved ? 'OT được duyệt' : 'OT bị từ chối',
        content: isApproved
            ? `Yêu cầu OT của bạn đã được phê duyệt${input.reply ? `: ${input.reply}` : ''}`
            : `Yêu cầu OT của bạn đã bị từ chối${input.reply ? `: ${input.reply}` : ''}`,
        type: 'APPROVAL',
        refType: 'OVERTIME_REQUEST',
        refId: request.id,
    })

    return {
        status: 'success',
        code: 200,
        message: isApproved ? 'Phê duyệt OT thành công' : 'Từ chối OT thành công',
        data: updated,
    }
}

// ── Mutation: tạo OT bù cho employee (manager) ──
const createCompensatoryOvertimeRequestForEmployee = async (approverId, input) => {
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: input.jobId, userId: approverId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    const overtimeRequest = await prisma.overtimeRequest.create({
        data: {
            userId: input.userId,
            jobId: input.jobId,
            date: new Date(input.date),
            startTime: new Date(input.startTime),
            endTime: new Date(input.endTime),
            minutes: input.minutes,
            reason: input.reason,
            status: 'APPROVED',
            approvedBy: approverId,
            approverAt: new Date(),
        },
        include: INCLUDE_RELATIONS,
    })

    // Thông báo cho employee
    await createAndPublishNotification({
        userId: input.userId,
        title: 'OT bù được tạo',
        content: `Manager đã tạo OT bù cho bạn: ${input.reason}`,
        type: 'OVERTIME',
        refType: 'OVERTIME_REQUEST',
        refId: overtimeRequest.id,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo OT bù cho nhân viên thành công',
        data: overtimeRequest,
    }
}

export default {
    getOvertimeRequestsByEmployee,
    getOvertimeRequestsByJob,
    createOvertimeRequest,
    cancelOvertimeRequest,
    reviewOvertimeRequest,
    createCompensatoryOvertimeRequestForEmployee,
}
