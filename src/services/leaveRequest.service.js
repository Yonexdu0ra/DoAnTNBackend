// ═══════════════════════════════════════════
//  LeaveRequest Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import fcmService from './fcm.services.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { createAuditLog } from '../utils/auditLog.js'
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
const LEAVE_FILTER_OPTIONS = {
    keywordFields: ['reason', 'reply'],
    inFieldMap: {
        statusIn: 'status',
        leaveTypeIn: 'leaveType',
    },
}

const publishLeaveRequestToManager = (jobId, payload) => {
    if (!jobId) return
    pubsub.publish(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(jobId), {
        managerReceivedLeaveRequest: payload,
    })
}

const publishLeaveRequestToEmployee = (userId, payload) => {
    if (!userId) return
    pubsub.publish(EVENTS.EMPLOYEE_LEAVE_STATUS(userId), {
        employeeReceivedLeaveRequestStatus: payload,
    })
}

// ── Query ──

/**
 * Lấy đơn xin nghỉ phép theo ID.
 */
const getLeaveRequestById = async (id, userId, select) => {
    if (!id) throw new Error('Thiếu ID đơn xin nghỉ phép')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const request = await prisma.leaveRequest.findUnique(findArgs)
    if (!request) {
        throw new Error('Không tìm thấy đơn đăng ký nghỉ phép')
    }

    const accessAllowed = await hasRecordAccess(userId, request.userId, request.jobId)

    if (!accessAllowed) {
        throw new Error('Bạn không có quyền xem đơn xin nghỉ phép này')
    }

    return request
}

/**
 * Lấy danh sách đơn nghỉ phép của nhân viên (Cursor Pagination).
 */
const getLeaveRequestsByEmployee = async (userId, pagination, orderBy, filter, select) => {
    const baseFilter = buildPrismaFilter(filter, LEAVE_FILTER_OPTIONS)
    const extraWhere = { ...baseFilter, userId }

    const findArgs = buildCursorPaginationArgs(pagination, orderBy, select, extraWhere)
    const items = await prisma.leaveRequest.findMany(findArgs)

    const limit = pagination?.limit || 10
    const { data, nextCursor } = processCursorResult(items, limit)

    return {
        nodes: data,
        pageInfo: buildCursorPageInfo(limit, nextCursor),
    }
}

/**
 * Lấy danh sách đơn nghỉ phép theo Project/Job (Page Pagination).
 */
const getLeaveRequestsByJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const baseFilter = buildPrismaFilter(filter, LEAVE_FILTER_OPTIONS)
    const extraWhere = { ...baseFilter, jobId }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.leaveRequest.findMany(findArgs),
        prisma.leaveRequest.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Nhân viên tạo đơn xin nghỉ phép
 */
const createLeaveRequest = async (userId, input) => {
    const { jobId, leaveType, startDate, endDate, reason } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!startDate || !endDate) throw new Error('Thiếu thời gian cho đơn nghỉ phép')
    if (!leaveType) throw new Error('Phân loại nghỉ phép không hợp lệ hoặc thiếu trống')
    if (!reason?.trim()) throw new Error('Thiếu lý do xin nghỉ phép')

    await ensureUserJoinedJob(userId, jobId, 'Bạn chưa tham gia dự án này hoặc trạng thái chưa được phê duyệt nên không thể tạo đơn')

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
        throw new Error('Thời gian kết thúc xin nghỉ phép không được trước thời gian bắt đầu.')
    }

    const request = await prisma.leaveRequest.create({
        data: {
            userId,
            jobId,
            leaveType,
            startDate: start,
            endDate: end,
            reason: reason.trim(),
            status: 'PENDING'
        }
    })

    await fcmService.notifyJobManagers(jobId, {
        title: 'Yêu cầu nghỉ phép mới',
        body: `Có nhân viên vừa tạo đơn xin nghỉ phép trong dự án của bạn`
    }, {
        type: 'LEAVE',
        refType: 'LEAVE',
        refId: request.id
    })

    // Ghi log tạo đơn
    createAuditLog({
        userId,
        action: 'CREATE_LEAVE_REQUEST',
        resource: 'LeaveRequest',
        resourceId: request.id,
        newValue: request,
        status: 'SUCCESS'
    });

    publishLeaveRequestToManager(jobId, request)

    publishLeaveRequestToEmployee(userId, request)

    return request
}

/**
 * Nhân viên tự hủy đơn nghỉ phép của mình (chỉ khi đang là PENDING)
 */
const cancelLeaveRequest = async (userId, input) => {
    const { leaveRequestId, reason } = input || {}

    if (!leaveRequestId) throw new Error('Thiếu ID đơn nghỉ')

    const existing = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } })
    if (!existing) throw new Error('Không tìm thấy đơn xin nghỉ phép')
    if (existing.userId !== userId) throw new Error('Bạn không có quyền thao tác trên đơn của người khác')
    if (existing.status !== 'PENDING') throw new Error('Chỉ được thao tác hủy khi đơn đang ở trạng thái chờ duyệt')

    const updated = await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
            status: 'CANCELED',
            reply: reason ? `Người dùng tự hủy: ${reason}` : 'Người dùng tự hủy đơn xin nghỉ phép'
        }
    })

    // Ghi log huỷ đơn
    createAuditLog({
        userId,
        action: 'CANCEL_LEAVE_REQUEST',
        resource: 'LeaveRequest',
        resourceId: leaveRequestId,
        oldValue: existing,
        newValue: updated,
        status: 'SUCCESS'
    });

    publishLeaveRequestToManager(existing.jobId, updated)

    publishLeaveRequestToEmployee(userId, updated)

    return updated
}

/**
 * Quản lý dự án duyệt hoặc từ chối đơn
 */
const reviewLeaveRequest = async (approverId, input) => {
    const { leaveRequestId, approve, reply } = input || {}

    if (!leaveRequestId) throw new Error('Thiếu ID đơn')
    if (!['APPROVED', 'REJECTED'].includes(approve)) {
        throw new Error('Trạng thái duyệt không hợp lệ')
    }

    const existing = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } })
    if (!existing) throw new Error('Không tìm đơn xin nghỉ phép cần duyệt')

    await ensureJobManagementAccess(approverId, existing.jobId, 'Bạn không có quyền duyệt đơn cho dự án này')

    if (existing.status !== 'PENDING') {
        throw new Error('Đơn này đã được xử lý xong từ trước')
    }

    const updated = await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
            status: approve,
            reply: reply || null,
            approvedBy: approverId,
            approverAt: new Date()
        }
    })

    // Trả kết quả notify cho nhân sự nộp đơn
    fcmService.sendToUser(existing.userId, {
        title: 'Kết quả xử lý đơn nghỉ phép',
        body: `Xin phép từ chối báo cáo. Yêu cầu nghỉ phép của bạn đã bị ${approve === 'APPROVED' ? 'chấp thuận' : 'từ chối'}`
    }, {
        type: 'SYSTEM',
        refType: 'LEAVE',
        refId: leaveRequestId
    }).catch(err => console.error("Lỗi gửi FCM:", err.message))

    publishLeaveRequestToManager(existing.jobId, updated)

    publishLeaveRequestToEmployee(existing.userId, {
        message: approve === 'APPROVED' ? 'Đơn xin nghỉ phép đã được phê duyệt' : 'Đơn xin nghỉ phép đã bị từ chối',
        data: updated,
    })

    return updated
}

/**
 * Backfill - Admin/Manager tạo bù đơn nghỉ phép trực tiếp
 */
const createCompensatoryLeaveRequestForEmployee = async (approverId, input) => {
    const { userId, jobId, leaveType, startDate, endDate, reason } = input || {}

    if (!userId || !jobId) throw new Error('Thiếu ID tham chiếu hợp lệ (nhân viên / dự án)')
    if (!startDate || !endDate) throw new Error('Thiếu cài đặt lịch trình nghỉ phép')
    if (!leaveType) throw new Error('Thiếu thông tin phân loại Leave Type')

    await ensureJobManagementAccess(approverId, jobId, 'Chỉ người trực tiếp quản lý hoặc Admin mới có quyền tạo lệnh nghỉ phép bù')

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
        throw new Error('Lịch trình nghỉ phép kết thúc trễ hơn bắt đầu')
    }

    const request = await prisma.leaveRequest.create({
        data: {
            userId,
            jobId,
            leaveType,
            startDate: start,
            endDate: end,
            reason: reason || 'Tạo bù thời gian theo lệnh bởi hệ thống / cấp quản lý',
            status: 'APPROVED', 
            approvedBy: approverId,
            approverAt: new Date(),
            reply: 'Duyệt auto ngầm định (Backfill Compensatory)'
        }
    })

    fcmService.sendToUser(userId, {
        title: 'Cập nhật nghỉ phép hệ thống',
        body: `Người quản lý đã thiết lập một mốc nghỉ phép bổ sung cho hồ sơ của bạn`
    }, {
        type: 'SYSTEM',
        refType: 'LEAVE',
        refId: request.id
    }).catch(err => console.error("Lỗi cập nhật FCM - Backfill:", err.message))

    publishLeaveRequestToManager(jobId, request)

    publishLeaveRequestToEmployee(userId, request)

    return request
}

export default {
    getLeaveRequestById,
    getLeaveRequestsByEmployee,
    getLeaveRequestsByJob,
    createLeaveRequest,
    cancelLeaveRequest,
    reviewLeaveRequest,
    createCompensatoryLeaveRequestForEmployee,
}
