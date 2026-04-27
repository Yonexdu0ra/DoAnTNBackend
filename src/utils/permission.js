import prisma from '../configs/prismaClient.js'

/**
 * Kiểm tra user có phải là admin không.
 */
export const isAdmin = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    })
    return user?.role === 'ADMIN'
}

/**
 * Kiểm tra user có phải là manager của job không.
 */
export const isManagerOfJob = async (userId, jobId) => {
    const count = await prisma.jobManager.count({
        where: { userId, jobId },
    })
    return count > 0
}

/**
 * Kiểm tra xem người dùng có quyền quản lý công việc hay không (Là Admin hoặc là Quản lý dự án).
 * Sẽ throw error nếu không có quyền.
 */
export const ensureJobManagementAccess = async (userId, jobId, errorMessage = 'Bạn không có quyền quản lý dự án này') => {
    const hasAccess = await isAdmin(userId) || await isManagerOfJob(userId, jobId)
    if (!hasAccess) {
        throw new Error(errorMessage)
    }
}

/**
 * Kiểm tra xem người dùng có quyền truy cập vào một bản ghi hay không.
 * (Là chủ sở hữu, là Admin hoặc là Quản lý dự án).
 * Trả về boolean.
 */
export const hasRecordAccess = async (userId, recordUserId, jobId) => {
    if (userId === recordUserId) return true
    if (await isAdmin(userId)) return true
    if (jobId && await isManagerOfJob(userId, jobId)) return true
    return false
}

/**
 * Xác nhận người dùng đã tham gia công việc và được duyệt.
 * Sẽ throw error nếu không hợp lệ.
 */
export const ensureUserJoinedJob = async (userId, jobId, errorMessage = 'Bạn chưa tham gia dự án này hoặc trạng thái chưa được phê duyệt') => {
    const joinedInfo = await prisma.userJoinedJob.findUnique({
        where: { idx_user_job: { userId, jobId } }
    })
    if (!joinedInfo || joinedInfo.status !== 'APPROVED') {
        throw new Error(errorMessage)
    }
    return joinedInfo
}
