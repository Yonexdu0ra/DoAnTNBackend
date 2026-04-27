// ═══════════════════════════════════════════
//  UserJoinedJob Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import fcmService from './fcm.services.js'
import { isManagerOfJob, isAdmin } from '../utils/permission.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'

/**
 * Thêm một hoặc nhiều nhân viên vào công việc.
 * 
 * @param {Object} input - { userIds: [string], jobId: string }
 * @param {string} managerId - id người yêu cầu (admin/manager)
 * @returns {Promise<UserJoinedJobResponse>} 
 */
const addEmployeeToJob = async (input, managerId) => {
    const { userIds, jobId } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Thiếu danh sách ID nhân viên')
    }

    // Kiểm tra quyền
    const hasAccess = await isAdmin(managerId) || await isManagerOfJob(managerId, jobId)
    if (!hasAccess) {
        throw new Error('Bạn không có quyền quản lý công việc này')
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Không tìm thấy công việc')

    // Lọc ra những user hợp lệ và chưa ở trong job
    const existingMemberships = await prisma.userJoinedJob.findMany({
        where: {
            jobId,
            userId: { in: userIds }
        }
    })

    const existingUserIds = existingMemberships.map(m => m.userId)
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
        return null
    }

    // Xác nhận các user này tồn tại trong hệ thống
    const validUsers = await prisma.user.findMany({
        where: { id: { in: newUserIds }, deletedAt: null }
    })
    const validUserIds = validUsers.map(u => u.id)

    // Tạo bản ghi cho các nhân viên mới (vì do manager thêm vào => tự động APPROVED)
    const createData = validUserIds.map(userId => ({
        userId,
        jobId,
        status: 'APPROVED'
    }))

    await prisma.userJoinedJob.createMany({ data: createData })

    // Thông báo cho các nhân viên vừa được thêm (FCM)
    for (const userId of validUserIds) {
        fcmService.sendToUser(userId, {
            title: 'Tham gia công việc mới',
            body: `Bạn đã được thêm vào công việc "${job.name}"`
        }, {
            type: 'SYSTEM',
            refType: 'JOB',
            refId: jobId
        }).catch(err => console.error("Lỗi gửi FCM:", err.message))
    }

    // Gửi data dummy record đầu tiên (do schema không mong đợi array hoặc GraphQL có thể tự wrap nullable response data)
    const firstCreatedRecord = await prisma.userJoinedJob.findUnique({
        where: { idx_user_job: { userId: validUserIds[0], jobId } }
    })

    pubsub.publish(EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId), {
        managerReceivedUserJoinedJob: firstCreatedRecord,
    })

    return firstCreatedRecord
}

/**
 * Xóa một hoặc nhiều nhân viên khỏi công việc.
 * 
 * @param {Object} input - { userIds: [string], jobId: string }
 * @param {string} managerId - id người yêu cầu (admin/manager)
 * @returns {Promise<UserJoinedJobResponse>} 
 */
const removeEmployeeFromJob = async (input, managerId) => {
    const { userIds, jobId } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Thiếu danh sách ID nhân viên')
    }

    // Kiểm tra quyền
    const hasAccess = await isAdmin(managerId) || await isManagerOfJob(managerId, jobId)
    if (!hasAccess) {
        throw new Error('Bạn không có quyền quản lý công việc này')
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Không tìm thấy công việc')

    const previewMembership = await prisma.userJoinedJob.findFirst({
        where: {
            jobId,
            userId: { in: userIds },
        },
        orderBy: { createdAt: 'desc' },
    })

    // Xóa những bản ghi khớp (nếu tồn tại)
    const deleteResult = await prisma.userJoinedJob.deleteMany({
        where: {
            jobId,
            userId: { in: userIds }
        }
    })

    if (deleteResult.count > 0) {
        // Thông báo cho các nhân viên vừa bị xóa khỏi job
        for (const userId of userIds) {
            fcmService.sendToUser(userId, {
                title: 'Rời công việc',
                body: `Bạn đã được đưa ra khỏi danh sách công việc "${job.name}"`
            }, {
                type: 'SYSTEM',
                refType: 'JOB',
                refId: jobId
            }).catch(err => console.error("Lỗi gửi FCM:", err.message))
        }

        pubsub.publish(EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId), {
            managerReceivedUserJoinedJob: previewMembership,
        })
    }

    return previewMembership
}

/**
 * Lấy tổng số nhân viên đã tham gia công việc
 * 
 * @param {string} jobId
 * @returns {Promise<number>}
 */
const getTotalMemberJoinedByJobId = async (jobId) => {
    if (!jobId) throw new Error('Thiếu ID công việc')
    
    const count = await prisma.userJoinedJob.count({
        where: { 
            jobId,
            status: 'APPROVED'
        }
    })
    return count
}

/**
 * Lấy tổng số nhân viên đã tham gia công việc (cho danh sách ID)
 * 
 * @param {string[]} jobIds
 * @returns {Promise<number[]>}
 */
const getTotalMemberJoinedByJobIds = async (jobIds) => {
    if (!jobIds || !Array.isArray(jobIds)) throw new Error('Thiếu danh sách ID công việc')
    if (jobIds.length === 0) return []
    
    // Dùng Promise.all để lấy count cho từng jobId theo đúng thứ tự
    const results = await Promise.all(
        jobIds.map(jobId => 
            prisma.userJoinedJob.count({
                where: { 
                    jobId,
                    status: 'APPROVED'
                }
            })
        )
    )
    return results
}

export default {
    addEmployeeToJob,
    removeEmployeeFromJob,
    getTotalMemberJoinedByJobId,
    getTotalMemberJoinedByJobIds,
}
