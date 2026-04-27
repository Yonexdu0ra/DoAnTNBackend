// ═══════════════════════════════════════════
//  Job Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const JOB_FILTER_OPTIONS = {
    keywordFields: ['title', 'description', 'address'],
    inFieldMap: {},
}

// ── Query ──

/**
 * Lấy công việc theo ID.
 */
const getJobById = async (id, userId, select) => {
    if (!id) throw new Error('Thiếu ID công việc')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const job = await prisma.job.findUnique(findArgs)

    if (!job) {
        throw new Error('Không tìm thấy công việc')
    }

    return job
}

/**
 * Lấy danh sách công việc chung (dành cho Admin quản lý hệ thống).
 */
const getJobs = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, JOB_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.job.findMany(findArgs),
        prisma.job.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

/**
 * Lấy danh sách dự án mà Employee tham gia.
 */
const getJobsByEmployee = async (userId, pagination, orderBy, filter, select) => {
    const baseFilter = buildPrismaFilter(filter, JOB_FILTER_OPTIONS)
    const extraWhere = {
        ...baseFilter,
        userJoinedJobs: {
            some: { userId }
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.job.findMany(findArgs),
        prisma.job.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

/**
 * Lấy danh sách dự án do Manager quản lý.
 */
const getJobsByManager = async (userId, pagination, orderBy, filter, select) => {
    const baseFilter = buildPrismaFilter(filter, JOB_FILTER_OPTIONS)
    const extraWhere = {
        ...baseFilter,
        manager: {
            some: { userId }
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.job.findMany(findArgs),
        prisma.job.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Tạo dự án công việc mới.
 */
const createJob = async (input, userId) => {
    const { 
        title, description, address, workStartTime, workEndTime, 
        earlyCheckInMinutes, lateCheckInMinutes, earlyCheckOutMinutes, 
        lateCheckOutMinutes, latitude, longitude, radius, maxMembers, managerIds 
    } = input || {}

    if (!title?.trim()) throw new Error('Thiếu tiêu đề dự án/công việc')
    if (!address?.trim()) throw new Error('Thiếu địa chỉ')
    if (latitude === undefined || longitude === undefined) throw new Error('Thiếu thông tin tọa độ')
    if (!workStartTime || !workEndTime) throw new Error('Thiếu thời gian kiểm tra chuyên cần')

    const start = new Date(workStartTime)
    const end = new Date(workEndTime)

    // Xác nhận quản lý hợp lệ (ROLE phải là MANAGER)
    let managerRecords = []
    if (managerIds && managerIds.length > 0) {
        const validUsers = await prisma.user.findMany({
            where: { id: { in: managerIds }, deletedAt: null }
        })
        
        const validIds = validUsers.map(u => u.id)
        if (validUsers.some(u => u.role !== 'MANAGER')) {
            throw new Error('Một số người giám sát được chọn không hợp lệ (ROLE != MANAGER)')
        }
        
        managerRecords = validIds.map(managerId => ({ userId: managerId }))
    }

    const job = await prisma.job.create({
        data: {
            title: title.trim(),
            description: description?.trim() || null,
            address: address.trim(),
            workStartTime: start,
            workEndTime: end,
            earlyCheckInMinutes: earlyCheckInMinutes ?? 15,
            lateCheckInMinutes: lateCheckInMinutes ?? 15,
            earlyCheckOutMinutes: earlyCheckOutMinutes ?? 15,
            lateCheckOutMinutes: lateCheckOutMinutes ?? 15,
            latitude,
            longitude,
            radius: radius ?? 50,
            maxMembers: maxMembers ?? 0,
            manager: managerRecords.length > 0 ? {
                create: managerRecords
            } : undefined
        },
    })

    return job
}

/**
 * Cập nhật cấu hình và chi tiết công việc.
 */
const updateJob = async (input, userId) => {
    const { jobId, data } = input || {}

    if (!jobId) throw new Error('Thiếu ID công việc')
    if (!data) throw new Error('Dữ liệu cập nhật trống')

    const existing = await prisma.job.findUnique({ where: { id: jobId } })
    if (!existing) throw new Error('Không tìm thấy công việc')

    const updateData = {}
    
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.address !== undefined) updateData.address = data.address.trim()
    if (data.workStartTime !== undefined) updateData.workStartTime = new Date(data.workStartTime)
    if (data.workEndTime !== undefined) updateData.workEndTime = new Date(data.workEndTime)
    
    if (data.earlyCheckInMinutes !== undefined) updateData.earlyCheckInMinutes = data.earlyCheckInMinutes
    if (data.lateCheckInMinutes !== undefined) updateData.lateCheckInMinutes = data.lateCheckInMinutes
    if (data.earlyCheckOutMinutes !== undefined) updateData.earlyCheckOutMinutes = data.earlyCheckOutMinutes
    if (data.lateCheckOutMinutes !== undefined) updateData.lateCheckOutMinutes = data.lateCheckOutMinutes
    
    if (data.latitude !== undefined) updateData.latitude = data.latitude
    if (data.longitude !== undefined) updateData.longitude = data.longitude
    if (data.radius !== undefined) updateData.radius = data.radius
    if (data.maxMembers !== undefined) updateData.maxMembers = data.maxMembers

    // Cập nhật người quản lý nếu có
    if (data.managerIds) {
        const validUsers = await prisma.user.findMany({
            where: { id: { in: data.managerIds }, deletedAt: null }
        })
        
        if (validUsers.some(u => u.role !== 'MANAGER')) {
            throw new Error('Một số người giám sát không hợp lệ (ROLE != MANAGER)')
        }

        const validIds = validUsers.map(u => u.id)
        
        // Gán qua "set" => cái nào không ở trong mảng sẽ bị disconnect/remove
        // Update data nested write: set không support onDelete cascade the way we need cho relationship 1-many đôi khi
        // Vì Prisma relationship (Job -> JobManager) dùng manager thì phải thao tác delete trước.
        await prisma.jobManager.deleteMany({ where: { jobId } })
        
        if (validIds.length > 0) {
            updateData.manager = {
                create: validIds.map(managerId => ({ userId: managerId }))
            }
        }
    }

    const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: updateData,
    })

    return updatedJob
}

/**
 * Xóa cứng công việc. Toàn bộ record liên đới sẽ bị xóa ngầm nhờ quy tắc onDelete Cascade.
 */
const deleteJob = async (input, userId) => {
    const { jobId } = input || {}
    if (!jobId) throw new Error('Thiếu ID công việc')

    const existing = await prisma.job.findUnique({ where: { id: jobId } })
    if (!existing) throw new Error('Không tìm thấy công việc')

    await prisma.job.delete({
        where: { id: jobId }
    })

    return {
    }
}

export default {
    getJobById,
    getJobs,
    getJobsByEmployee,
    getJobsByManager,
    createJob,
    updateJob,
    deleteJob,
}
