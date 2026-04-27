// ═══════════════════════════════════════════
//  JobManager Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import fcmService from './fcm.services.js'
import { isAdmin } from '../utils/permission.js'

/**
 * Thêm một hoặc nhiều người quản lý (manager) vào công việc.
 * 
 * @param {Object} input - { userIds: [string], jobId: string }
 * @param {string} actorId - id admin thực hiện thao tác
 * @returns {Promise<JobManagerResponse>} 
 */
const addManagerToJob = async (input, actorId) => {
    const { userIds, jobId } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Thiếu danh sách ID người quản lý')
    }

    // Kiểm tra quyền (chỉ ADMIN mới được phân quyền Manager cho Job)
    const hasAccess = await isAdmin(actorId)
    if (!hasAccess) {
        throw new Error('Bạn không có quyền phân bổ quản lý cho công việc. Chỉ Admin được phép thực hiện chức năng này.')
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Không tìm thấy công việc')

    // Lọc ra các manager đã được gán sẵn
    const existingManagers = await prisma.jobManager.findMany({
        where: {
            jobId,
            userId: { in: userIds }
        }
    })

    const existingUserIds = existingManagers.map(m => m.userId)
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
        return null
    }

    // Đảm bảo những người dùng được gán có tồn tại và Role của họ là MANAGER
    const validUsers = await prisma.user.findMany({
        where: { id: { in: newUserIds }, deletedAt: null }
    })
    const validUserIds = validUsers.map(u => u.id)

    const invalidRoleUsers = validUsers.filter(u => u.role !== 'MANAGER')
    if (invalidRoleUsers.length > 0) {
        throw new Error(`Một số nhân sự được chọn không có chức danh quản lý (ROLE !== MANAGER). Vui lòng kiểm tra lại.`)
    }

    // Tạo bản ghi cho các manager mới
    const createData = validUserIds.map(userId => ({
        userId,
        jobId,
    }))

    await prisma.jobManager.createMany(createData)

    // Thông báo cho các quản lý vừa được thêm (FCM)
    for (const userId of validUserIds) {
        fcmService.sendToUser(userId, {
            title: 'Phân công quản lý',
            body: `Bạn đã được chỉ định quản lý dự án "${job.name}"`
        }, {
            type: 'SYSTEM',
            refType: 'JOB',
            refId: jobId
        }).catch(err => console.error("Lỗi gửi FCM:", err.message))
    }

    // Gửi data mô phòng trả về do schema GraphQL chỉ expect 1 bản ghi
    const firstCreatedRecord = await prisma.jobManager.findFirst({
        where: { userId: validUserIds[0], jobId }
    })

    return {
        message: `Đã cắt cử thành công ${validUserIds.length} quản lý cho dự án này`,
        data: firstCreatedRecord,
    }
}

/**
 * Xóa một hoặc nhiều người quản lý khỏi công việc.
 * 
 * @param {Object} input - { userIds: [string], jobId: string }
 * @param {string} actorId - id admin thực hiện
 * @returns {Promise<JobManagerResponse>} 
 */
const removeManagerFromJob = async (input, actorId) => {
    const { userIds, jobId } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Thiếu danh sách ID quản lý')
    }

    // Kiểm tra quyền (chỉ ADMIN)
    const hasAccess = await isAdmin(actorId)
    if (!hasAccess) {
        throw new Error('Bạn không có quyền thu hồi vai trò quản lý. Chỉ Admin được phép thực hiện chức năng này.')
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Không tìm thấy công việc')

    // Xóa những bản ghi khớp (nếu tồn tại)
    const deleteResult = await prisma.jobManager.deleteMany({
        where: {
            jobId,
            userId: { in: userIds }
        }
    })

    if (deleteResult.count > 0) {
        // Thông báo
        for (const userId of userIds) {
            fcmService.sendToUser(userId, {
                title: 'Rời ban quản lý',
                body: `Bạn đã được bãi bỏ vị trí quản lý trong dự án "${job.name}"`
            }, {
                type: 'SYSTEM',
                refType: 'JOB',
                refId: jobId
            }).catch(err => console.error("Lỗi gửi FCM:", err.message))
        }
    }

    return {
        message: `Đã loại bỏ quyền giám sát của ${deleteResult.count} người quản lý`,
        data: null,
    }
}

export default {
    addManagerToJob,
    removeManagerFromJob,
}
