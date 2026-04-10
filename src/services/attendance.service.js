import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildCursorPaginationArgs,
    processCursorResult,
    buildPrismaFilter,
} from '../utils/pagination.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'

const KEYWORD_FIELDS = ['fraudReason']
const IN_FIELD_MAP = { typeIn: 'type' }
const INCLUDE_RELATIONS = {
    user: { include: { profile: true, department: true, position: true } },
    job: true,
}

// ── Query: chấm công theo thời gian (employee) ──
const getAttendancesByEmployeeByTime = async (
    userId,
    startDate,
    endDate,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const data = await prisma.attendance.findMany({
        where: {
            userId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
            ...filterWhere,
        },
        ...(select ? { select } : {}),
        orderBy: { date: 'desc' },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách chấm công thành công',
        data,
        pagination: {
            page: 1,
            limit: data.length,
            total: data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        },
    }
}

// ── Query: chấm công employee (cursor-based) ──
const getAttendancesByEmployee = async (
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

    const items = await prisma.attendance.findMany({
        ...args,
        ...(select ? { select } : {}),
    })
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách chấm công thành công',
        data,
        pagination: {
            limit,
            nextCursor,
            hasNextPage: !!nextCursor,
        },
    }
}

// ── Query: chấm công theo job (manager, page-based) ──
const getAttendancesByJob = async (
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
        prisma.attendance.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.attendance.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách chấm công theo công việc thành công',
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

// ── Mutation: review gian lận chấm công (manager) ──
const reviewAttendanceFraud = async (input, approverUserId) => {
    const attendance = await prisma.attendance.findUnique({
        where: { id: input.attendanceId },
        include: INCLUDE_RELATIONS,
    })
    if (!attendance) throw new Error('Bản ghi chấm công không tồn tại')

    const updated = await prisma.attendance.update({
        where: { id: input.attendanceId },
        data: {
            isFraud: input.isFraud,
            fraudReason: input.fraudReason || null,
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho employee
    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(attendance.userId), {
        employeeReceivedAttendanceStatus: {
            status: 'success',
            code: 200,
            message: input.isFraud
                ? 'Chấm công của bạn đã bị đánh dấu gian lận'
                : 'Chấm công của bạn đã được xác nhận hợp lệ',
            data: updated,
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Review chấm công thành công',
        data: updated,
    }
}

// ── Mutation: đánh dấu gian lận chấm công theo job (manager) ──
const markAttendanceAsFraudByJob = async (input, approverUserId) => {
    const attendance = await prisma.attendance.findFirst({
        where: { id: input.attendanceId, jobId: input.jobId },
        include: INCLUDE_RELATIONS,
    })
    if (!attendance) throw new Error('Bản ghi chấm công không tồn tại trong công việc này')

    const updated = await prisma.attendance.update({
        where: { id: input.attendanceId },
        data: {
            isFraud: true,
            fraudReason: input.fraudReason,
        },
        include: INCLUDE_RELATIONS,
    })

    // Publish cho employee
    pubsub.publish(EVENTS.EMPLOYEE_ATTENDANCE_STATUS(attendance.userId), {
        employeeReceivedAttendanceStatus: {
            status: 'success',
            code: 200,
            message: 'Chấm công của bạn đã bị đánh dấu gian lận',
            data: updated,
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Đánh dấu gian lận thành công',
        data: updated,
    }
}

export default {
    getAttendancesByEmployeeByTime,
    getAttendancesByEmployee,
    getAttendancesByJob,
    reviewAttendanceFraud,
    markAttendanceAsFraudByJob,
}
