import prisma from '../configs/prismaClient.js'
import { invalidateCache, getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../utils/redisCache.js'
import { buildPagePaginationArgs } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import notificationService from './notification.service.js'

/**
 * Kiểm tra user có phải là manager của job không
 */
export const verifyManagerOfJob = async (userId, jobId) => {
    const jobManager = await prisma.jobManager.findFirst({
        where: { userId, jobId },
    })
    if (!jobManager) {
        throw new Error('Bạn không phải là quản lý của công việc này')
    }
    return jobManager
}

/**
 * Phân trang danh sách jobs (admin)
 */
const getJobs = async (pagination, orderBy, search, select = {}) => {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const cacheKey = CACHE_KEYS.JOBS_LIST(
        page, limit,
        orderBy?.field || 'createdAt', orderBy?.direction || 'desc',
        search?.field, search?.value
    )

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search)

    const [data, total] = await Promise.all([
        prisma.job.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.job.count({ where: paginationArgs.where }),
    ])

    const result = { data, total }
    await setCache(cacheKey, result, CACHE_TTL.PAGINATED_LIST)
    return result
}

/**
 * Tạo job mới (admin)
 */
const createJob = async (input, adminId) => {
    const { managerIds, ...jobData } = input

    const job = await prisma.job.create({
        data: {
            ...jobData,
            ...(managerIds?.length > 0 && {
                manager: {
                    create: managerIds.map(userId => ({ userId })),
                },
            }),
        },
        include: { manager: true },
    })

    await invalidateCache('jobs:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'CREATE_JOB',
        resource: 'Job',
        resourceId: job.id,
        newValue: job,
        status: 'SUCCESS',
    })

    if (managerIds?.length > 0) {
        for (const managerId of managerIds) {
            await pubsub.publish(EVENTS.JOB_MANAGER_UPDATED, job)
        }
    }

    return job
}

/**
 * Cập nhật job (admin)
 */
const updateJob = async (id, input, adminId) => {
    const oldJob = await prisma.job.findUnique({
        where: { id },
        include: { manager: true },
    })
    if (!oldJob) throw new Error('Công việc không tồn tại')

    const { managerIds, ...jobData } = input

    await prisma.job.update({
        where: { id },
        data: jobData,
    })

    if (managerIds !== undefined) {
        await prisma.jobManager.deleteMany({ where: { jobId: id } })
        if (managerIds.length > 0) {
            await prisma.jobManager.createMany({
                data: managerIds.map(userId => ({ jobId: id, userId })),
            })
        }
    }

    const updatedJob = await prisma.job.findUnique({
        where: { id },
        include: { manager: true },
    })

    await invalidateCache('jobs:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'UPDATE_JOB',
        resource: 'Job',
        resourceId: id,
        oldValue: oldJob,
        newValue: updatedJob,
        status: 'SUCCESS',
    })

    return updatedJob
}

/**
 * Xóa job (admin)
 */
const deleteJob = async (id, adminId) => {
    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) throw new Error('Công việc không tồn tại')

    await prisma.job.delete({ where: { id } })

    await invalidateCache('jobs:*')
    await invalidateCache('stats:*')

    await createAuditLog({
        userId: adminId,
        action: 'DELETE_JOB',
        resource: 'Job',
        resourceId: id,
        oldValue: job,
        status: 'SUCCESS',
    })

    return job
}

/**
 * Danh sách jobs mà manager đang quản lý
 */
const getJobsByManager = async (userId, pagination, orderBy, search, select = {}) => {
    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search, {
        manager: { some: { userId } },
    })

    const [data, total] = await Promise.all([
        prisma.job.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.job.count({ where: paginationArgs.where }),
    ])

    return { data, total }
}

/**
 * Danh sách nhân viên trong job (manager)
 */
const getUsersByJob = async (managerId, jobId, pagination, orderBy, search, select = {}) => {
    await verifyManagerOfJob(managerId, jobId)

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const skip = (page - 1) * limit

    const userJoinedJobs = await prisma.userJoinedJob.findMany({
        where: { jobId, status: 'APPROVED' },
        select: { userId: true },
    })
    const userIds = userJoinedJobs.map(u => u.userId)

    const searchWhere = {}
    if (search?.field && search?.value) {
        searchWhere[search.field] = { contains: search.value, mode: 'insensitive' }
    }

    const where = { id: { in: userIds }, deletedAt: null, ...searchWhere }
    const orderByPrisma = orderBy?.field
        ? { [orderBy.field]: orderBy.direction || 'desc' }
        : { createdAt: 'desc' }

    const [data, total] = await Promise.all([
        prisma.user.findMany({
            where, skip, take: limit, orderBy: orderByPrisma,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.user.count({ where }),
    ])

    return { data, total }
}

/**
 * Quản lý nhân viên trong job (manager)
 */
const manageEmployeeInJob = async (managerId, jobId, employeeIds) => {
    await verifyManagerOfJob(managerId, jobId)

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new Error('Công việc không tồn tại')

    const currentMembers = await prisma.userJoinedJob.findMany({
        where: { jobId, status: 'APPROVED' },
        select: { userId: true },
    })
    const currentIds = currentMembers.map(m => m.userId)

    const toAdd = employeeIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !employeeIds.includes(id))

    // Thêm nhân viên mới
    if (toAdd.length > 0) {
        const totalAfterAdd = currentIds.length - toRemove.length + toAdd.length
        if (job.maxMembers > 0 && totalAfterAdd > job.maxMembers) {
            throw new Error(`Vượt quá số lượng nhân viên tối đa (${job.maxMembers})`)
        }

        for (const userId of toAdd) {
            await prisma.userJoinedJob.upsert({
                where: { idx_user_job: { userId, jobId } },
                create: { userId, jobId, status: 'APPROVED' },
                update: { status: 'APPROVED' },
            })
            await notificationService.createAndPublish(userId, 'Được thêm vào công việc', `Bạn đã được thêm vào công việc: ${job.title}`, 'SYSTEM', 'JOB', jobId)
        }
    }

    // Xóa nhân viên
    if (toRemove.length > 0) {
        await prisma.userJoinedJob.updateMany({
            where: { jobId, userId: { in: toRemove } },
            data: { status: 'CANCELED' },
        })
        for (const userId of toRemove) {
            await notificationService.createAndPublish(userId, 'Bị xóa khỏi công việc', `Bạn đã bị xóa khỏi công việc: ${job.title}`, 'SYSTEM', 'JOB', jobId)
        }
    }

    await invalidateCache('stats:*')
    await pubsub.publish(EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId), { jobId })

    const updatedJob = await prisma.job.findUnique({
        where: { id: jobId },
        include: { manager: true },
    })

    return { job: updatedJob, added: toAdd.length, removed: toRemove.length }
}

export default {
    getJobs,
    createJob,
    updateJob,
    deleteJob,
    getJobsByManager,
    getUsersByJob,
    manageEmployeeInJob,
    verifyManagerOfJob,
}
