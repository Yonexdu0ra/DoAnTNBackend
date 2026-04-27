// ═══════════════════════════════════════════
//  OvertimeRequest Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import fcmService from './fcm.services.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { isManagerOfJob, isAdmin, ensureJobManagementAccess, hasRecordAccess, ensureUserJoinedJob } from '../utils/permission.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildCursorPaginationArgs,
    processCursorResult,
    buildCursorPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const OVERTIME_FILTER_OPTIONS = {
    keywordFields: ['reason', 'reply'],
    inFieldMap: {
        statusIn: 'status',
    },
}

const publishOvertimeRequestToManager = (jobId, payload) => {
    if (!jobId) return
    pubsub.publish(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(jobId), {
        managerReceivedOvertimeRequest: payload,
    })
}

const publishOvertimeRequestToEmployee = (userId, payload) => {
    if (!userId) return
    pubsub.publish(EVENTS.EMPLOYEE_OVERTIME_STATUS(userId), {
        employeeReceivedOvertimeRequestStatus: payload,
    })
}

// ── Query ──

/**
 * Thấy đơn làm thêm giờ theo ID.
 */
const getOvertimeRequestById = async (id, userId, select) => {
    if (!id) throw new Error('Thiếu ID đơn OT')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const request = await prisma.overtimeRequest.findUnique(findArgs)
    if (!request) {
        throw new Error('Không tìm thấy đơn đăng ký làm thêm giờ')
    }

    const accessAllowed = await hasRecordAccess(userId, request.userId, request.jobId)

    if (!accessAllowed) {
        throw new Error('Bạn không có quyền xem đơn này')
    }

    return request
}

/**
 * Lấy danh sách đơn OT theo nhân viên (Sử dụng Cursor Pagination).
 */
const getOvertimeRequestsByEmployee = async (userId, pagination, orderBy, filter, select) => {
    const baseFilter = buildPrismaFilter(filter, OVERTIME_FILTER_OPTIONS)
    const extraWhere = { ...baseFilter, userId }

    const findArgs = buildCursorPaginationArgs(pagination, orderBy, select, extraWhere)
    const items = await prisma.overtimeRequest.findMany(findArgs)

    const limit = pagination?.limit || 10
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        nodes: data,
        pageInfo: buildCursorPageInfo(limit, nextCursor),
    }
}

/**
 * Lấy danh sách đơn OT theo công việc (Dùng cho Manager/Admin - Page Pagination).
 */
const getOvertimeRequestsByJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const baseFilter = buildPrismaFilter(filter, OVERTIME_FILTER_OPTIONS)
    const extraWhere = { ...baseFilter, jobId }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.overtimeRequest.findMany(findArgs),
        prisma.overtimeRequest.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Nhân viên tạo đơn đăng ký làm thêm giờ
 */
const createOvertimeRequest = async (userId, input) => {
    const { jobId, date, startTime, endTime, minutes, reason } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!date || !startTime || !endTime) throw new Error('Thiếu thời gian làm thêm giờ')
    if (!reason?.trim()) throw new Error('Thiếu lý do xin làm thêm giờ')

    await ensureUserJoinedJob(userId, jobId, 'Bạn chưa tham gia dự án này hoặc trạng thái chưa được phê duyệt nên không thể tạo đơn')

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (start >= end) {
        throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu.')
    }

    const request = await prisma.overtimeRequest.create({
        data: {
            userId,
            jobId,
            date: new Date(date),
            startTime: start,
            endTime: end,
            minutes: minutes || Math.floor((end.getTime() - start.getTime()) / 60000), // tính tự động dựa trên thời gian
            reason: reason.trim(),
            status: 'PENDING'
        }
    })

    await fcmService.notifyJobManagers(jobId, {
        title: 'Yêu cầu làm thêm giờ mới',
        body: `Có nhân viên vừa tạo yêu cầu làm thêm giờ trong dự án`
    }, {
        type: 'REQUEST',
        refType: 'OVERTIME',
        refId: request.id
    })

    publishOvertimeRequestToManager(jobId, request)

    publishOvertimeRequestToEmployee(userId, request)

    return request
}

/**
 * Nhân viên tự hủy đơn OT (nếu đang ở PENDING)
 */
const cancelOvertimeRequest = async (userId, input) => {
    const { overtimeRequestId, reason } = input || {}

    if (!overtimeRequestId) throw new Error('Thiếu ID đơn OT')

    const existing = await prisma.overtimeRequest.findUnique({ where: { id: overtimeRequestId } })
    if (!existing) throw new Error('Không tìm thấy đơn OT')
    if (existing.userId !== userId) throw new Error('Bạn không có quyền thao tác trên đơn người khác')
    if (existing.status !== 'PENDING') throw new Error('Chỉ có thể hủy đơn khi đang chờ xử lý')

    const updated = await prisma.overtimeRequest.update({
        where: { id: overtimeRequestId },
        data: {
            status: 'CANCELED',
            reply: reason ? `Người dùng tự hủy: ${reason}` : 'Người dùng tự hủy đơn xin làm thêm giờ'
        }
    })

    publishOvertimeRequestToManager(existing.jobId, updated)

    publishOvertimeRequestToEmployee(userId, updated)

    return updated
}

/**
 * Quản lý duyệt/từ chối đơn OT
 */
const reviewOvertimeRequest = async (approverId, input) => {
    const { overtimeRequestId, approve, reply } = input || {}

    if (!overtimeRequestId) throw new Error('Thiếu ID đơn')
    if (!['APPROVED', 'REJECTED'].includes(approve)) {
        throw new Error('Trạng thái duyệt không hợp lệ')
    }

    const existing = await prisma.overtimeRequest.findUnique({ where: { id: overtimeRequestId } })
    if (!existing) throw new Error('Không tìm thấy đơn cần duyệt')

    await ensureJobManagementAccess(approverId, existing.jobId, 'Bạn không có quyền duyệt đơn cho dự án này')

    if (existing.status !== 'PENDING') {
        throw new Error('Đơn này đã được xử lý trước đó')
    }

    const updated = await prisma.overtimeRequest.update({
        where: { id: overtimeRequestId },
        data: {
            status: approve,
            reply: reply || null,
            approvedBy: approverId,
            approverAt: new Date()
        }
    })

    // Gửi báo kết quả cho nhân viên nộp đơn
    fcmService.sendToUser(existing.userId, {
        title: 'Kết quả xử lý đơn làm thêm giờ',
        body: `Yêu cầu làm thêm giờ của bạn đã bị ${approve === 'APPROVED' ? 'chấp thuận' : 'từ chối'}`
    }, {
        type: 'SYSTEM',
        refType: 'OVERTIME',
        refId: overtimeRequestId
    }).catch(err => console.error("Lỗi gửi FCM:", err.message))

    publishOvertimeRequestToManager(existing.jobId, updated)

    publishOvertimeRequestToEmployee(existing.userId, {
        message: approve === 'APPROVED' ? 'Đơn làm thêm giờ đã được phê duyệt' : 'Đơn làm thêm giờ đã bị từ chối',
        data: updated,
    })

    return updated
}

/**
 * Admin hoặc Manager tạo bù đơn OT trực tiếp (Backfill Record)
 */
const createCompensatoryOvertimeRequestForEmployee = async (approverId, input) => {
    const { userId, jobId, date, startTime, endTime, minutes, reason } = input || {}

    if (!userId || !jobId) throw new Error('Thiếu ID nhân viên hoặc dự án')
    if (!date || !startTime || !endTime) throw new Error('Thiếu thời gian cho đơn OT')

    await ensureJobManagementAccess(approverId, jobId, 'Bạn không có quyền quản lý và cập nhật thời gian OT bù cho nhân viên này')

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (start >= end) {
        throw new Error('Thời gian kết thúc OT không được sớm hơn bắt đầu')
    }

    const request = await prisma.overtimeRequest.create({
        data: {
            userId,
            jobId,
            date: new Date(date),
            startTime: start,
            endTime: end,
            minutes: minutes || Math.floor((end.getTime() - start.getTime()) / 60000), 
            reason: reason || 'Khai báo/Tạo bù thời gian làm thêm bởi Quản lý',
            status: 'APPROVED', 
            approvedBy: approverId,
            approverAt: new Date(),
            reply: 'Được tạo và duyệt tự động bởi hệ thống Quản lý'
        }
    })

    fcmService.sendToUser(userId, {
        title: 'Tạo phiếu OT bù',
        body: `Người quản lý đã ghi nhận và duyệt thời gian làm thêm giờ của bạn`
    }, {
        type: 'SYSTEM',
        refType: 'OVERTIME',
        refId: request.id
    }).catch(err => console.error("Lỗi báo tạo bù FCM:", err.message))

    publishOvertimeRequestToManager(jobId, request)

    publishOvertimeRequestToEmployee(userId, request)

    return request
}

export default {
    getOvertimeRequestById,
    getOvertimeRequestsByEmployee,
    getOvertimeRequestsByJob,
    createOvertimeRequest,
    cancelOvertimeRequest,
    reviewOvertimeRequest,
    createCompensatoryOvertimeRequestForEmployee,
}
