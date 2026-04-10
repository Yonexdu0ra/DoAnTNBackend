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
const IN_FIELD_MAP = { leaveTypeIn: 'leaveType', statusIn: 'status' }
const INCLUDE_RELATIONS = {
    user: { include: { profile: true, department: true, position: true } },
    job: true,
    approver: { include: { profile: true, department: true, position: true } },
}

// ── Query: yêu cầu nghỉ phép của employee (cursor-based) ──
const getLeaveRequestsByEmployee = async (
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

    const items = await prisma.leaveRequest.findMany({
        ...args,
        ...(select ? { select } : {}),
    })
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách yêu cầu nghỉ phép thành công',
        data,
        pagination: {
            limit,
            nextCursor,
            hasNextPage: !!nextCursor,
        },
    }
}

// ── Query: yêu cầu nghỉ phép theo job (manager, page-based) ──
const getLeaveRequestsByJob = async (
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
        prisma.leaveRequest.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.leaveRequest.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách yêu cầu nghỉ phép theo công việc thành công',
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

// ── Mutation: tạo yêu cầu nghỉ phép (employee) ──
const createLeaveRequest = async (userId, input) => {
    // Kiểm tra user có trong job không
    const userInJob = await prisma.userJoinedJob.findFirst({
        where: { userId, jobId: input.jobId, status: 'APPROVED' },
    })
    if (!userInJob) throw new Error('Bạn chưa tham gia công việc này')

    const leaveRequest = await prisma.leaveRequest.create({
        data: {
            userId,
            jobId: input.jobId,
            leaveType: input.leaveType,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            reason: input.reason,
            status: 'PENDING',
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho manager của job
    pubsub.publish(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(input.jobId), {
        managerReceivedLeaveRequest: {
            status: 'success',
            code: 200,
            message: 'Có yêu cầu nghỉ phép mới',
            data: leaveRequest,
        },
    })

    // Tạo notification cho managers của job
    const jobManagers = await prisma.jobManager.findMany({
        where: { jobId: input.jobId },
        select: { userId: true },
    })
    const employeeName = leaveRequest.user?.profile?.fullName || 'Nhân viên'
    for (const jm of jobManagers) {
        await createAndPublishNotification({
            userId: jm.userId,
            title: 'Yêu cầu nghỉ phép mới',
            content: `${employeeName} đã gửi yêu cầu nghỉ phép`,
            type: 'LEAVE',
            refType: 'LEAVE_REQUEST',
            refId: leaveRequest.id,
        })
    }

    return {
        status: 'success',
        code: 201,
        message: 'Tạo yêu cầu nghỉ phép thành công',
        data: leaveRequest,
    }
}

// ── Mutation: huỷ yêu cầu nghỉ phép (employee) ──
const cancelLeaveRequest = async (userId, input) => {
    const leaveRequest = await prisma.leaveRequest.findFirst({
        where: { id: input.leaveRequestId, userId },
    })
    if (!leaveRequest) throw new Error('Yêu cầu nghỉ phép không tồn tại')
    if (leaveRequest.status !== 'PENDING') throw new Error('Chỉ có thể huỷ yêu cầu đang chờ duyệt')

    const updated = await prisma.leaveRequest.update({
        where: { id: input.leaveRequestId },
        data: {
            status: 'CANCELED',
            reply: input.reason || 'Đã huỷ bởi nhân viên',
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho manager của job để cập nhật table realtime
    pubsub.publish(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(leaveRequest.jobId), {
        managerReceivedLeaveRequest: {
            status: 'success',
            code: 200,
            message: 'Yêu cầu nghỉ phép đã được huỷ bởi nhân viên',
            data: updated,
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Huỷ yêu cầu nghỉ phép thành công',
        data: updated,
    }
}

// ── Mutation: review yêu cầu nghỉ phép (manager) ──
const reviewLeaveRequest = async (approverId, input) => {
    const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: input.leaveRequestId },
    })
    if (!leaveRequest) throw new Error('Yêu cầu nghỉ phép không tồn tại')
    if (leaveRequest.status !== 'PENDING') throw new Error('Yêu cầu này đã được xử lý')

    // Kiểm tra manager có quản lý job này không
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: leaveRequest.jobId, userId: approverId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    const decision = String(input.approve || '').toUpperCase()
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new Error('Trạng thái duyệt không hợp lệ, chỉ chấp nhận APPROVED hoặc REJECTED')
    }

    const isApproved = decision === 'APPROVED'
    const newStatus = isApproved ? 'APPROVED' : 'REJECTED'
    const updated = await prisma.leaveRequest.update({
        where: { id: input.leaveRequestId },
        data: {
            status: newStatus,
            reply: input.reply || null,
            approvedBy: approverId,
            approverAt: new Date(),
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho employee
    pubsub.publish(EVENTS.EMPLOYEE_LEAVE_STATUS(leaveRequest.userId), {
        employeeReceivedLeaveRequestStatus: {
            status: 'success',
            code: 200,
            message: isApproved
                ? 'Yêu cầu nghỉ phép đã được phê duyệt'
                : 'Yêu cầu nghỉ phép đã bị từ chối',
            data: updated,
        },
    })

    // Tạo notification cho employee
    await createAndPublishNotification({
        userId: leaveRequest.userId,
        title: isApproved ? 'Nghỉ phép được duyệt' : 'Nghỉ phép bị từ chối',
        content: isApproved
            ? `Yêu cầu nghỉ phép của bạn đã được phê duyệt${input.reply ? `: ${input.reply}` : ''}`
            : `Yêu cầu nghỉ phép của bạn đã bị từ chối${input.reply ? `: ${input.reply}` : ''}`,
        type: 'APPROVAL',
        refType: 'LEAVE_REQUEST',
        refId: leaveRequest.id,
    })

    return {
        status: 'success',
        code: 200,
        message: isApproved ? 'Phê duyệt thành công' : 'Từ chối thành công',
        data: updated,
    }
}

// ── Mutation: tạo nghỉ bù cho employee (manager) ──
const createCompensatoryLeaveRequestForEmployee = async (approverId, input) => {
    // Kiểm tra manager có quản lý job này không
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: input.jobId, userId: approverId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    const leaveRequest = await prisma.leaveRequest.create({
        data: {
            userId: input.userId,
            jobId: input.jobId,
            leaveType: input.leaveType,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
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
        title: 'Nghỉ bù được tạo',
        content: `Manager đã tạo nghỉ bù cho bạn: ${input.reason}`,
        type: 'LEAVE',
        refType: 'LEAVE_REQUEST',
        refId: leaveRequest.id,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo nghỉ bù cho nhân viên thành công',
        data: leaveRequest,
    }
}

export default {
    getLeaveRequestsByEmployee,
    getLeaveRequestsByJob,
    createLeaveRequest,
    cancelLeaveRequest,
    reviewLeaveRequest,
    createCompensatoryLeaveRequestForEmployee,
}
