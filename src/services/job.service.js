import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'

const KEYWORD_FIELDS = ['title', 'description', 'address']
const INCLUDE_MANAGERS = {
    manager: {
        include: {
            user: { include: { profile: true, department: true, position: true } },
        },
    },
}

// ── Query: danh sách jobs (admin, page-based) ──
const getJobs = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })
    const args = buildPagePaginationArgs(pagination, orderBy, null, filterWhere)

    const [data, total] = await Promise.all([
        prisma.job.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.job.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách công việc thành công',
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

// ── Query: jobs của manager (page-based) ──
const getJobsByManager = async (
    userId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })

    // Lấy jobs mà user là manager
    const jobIds = await prisma.jobManager.findMany({
        where: { userId },
        select: { jobId: true },
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        id: { in: jobIds.map((j) => j.jobId) },
        ...filterWhere,
    })

    const [data, total] = await Promise.all([
        prisma.job.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.job.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách công việc thành công',
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

// ── Query: jobs của employee (page-based) ──
const getJobsByEmployee = async (
    userId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        ...filterWhere,
        userJoinedJobs: {
            some: {
                userId,
                status: 'APPROVED',
            },
        },
    })

    const [data, total] = await Promise.all([
        prisma.job.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.job.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách công việc thành công',
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

// ── Mutation: tạo job (admin) ──
const createJob = async (input, userId) => {
    const job = await prisma.job.create({
        data: {
            title: input.title,
            description: input.description || null,
            address: input.address,
            workStartTime: new Date(input.workStartTime),
            workEndTime: new Date(input.workEndTime),
            earlyCheckInMinutes: input.earlyCheckInMinutes ?? 15,
            lateCheckInMinutes: input.lateCheckInMinutes ?? 15,
            earlyCheckOutMinutes: input.earlyCheckOutMinutes ?? 15,
            lateCheckOutMinutes: input.lateCheckOutMinutes ?? 15,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
            maxMembers: input.maxMembers,
            ...(input.managerIds?.length > 0 && {
                manager: {
                    create: input.managerIds.map((manId) => ({
                        userId: manId,
                    })),
                },
            }),
        },
        include: INCLUDE_MANAGERS,
    })

    await createAuditLog({
        userId,
        action: 'CREATE_JOB',
        resource: 'Job',
        resourceId: job.id,
        newValue: job,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo công việc thành công',
        data: job,
    }
}

// ── Mutation: cập nhật job (admin) ──
const updateJob = async (input, userId) => {
    const existing = await prisma.job.findUnique({
        where: { id: input.jobId },
        include: INCLUDE_MANAGERS,
    })
    if (!existing) throw new Error('Công việc không tồn tại')

    const payload = input.data
    const updateData = {}
    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.address !== undefined) updateData.address = payload.address
    if (payload.workStartTime !== undefined) updateData.workStartTime = new Date(payload.workStartTime)
    if (payload.workEndTime !== undefined) updateData.workEndTime = new Date(payload.workEndTime)
    if (payload.earlyCheckInMinutes !== undefined) updateData.earlyCheckInMinutes = payload.earlyCheckInMinutes
    if (payload.lateCheckInMinutes !== undefined) updateData.lateCheckInMinutes = payload.lateCheckInMinutes
    if (payload.earlyCheckOutMinutes !== undefined) updateData.earlyCheckOutMinutes = payload.earlyCheckOutMinutes
    if (payload.lateCheckOutMinutes !== undefined) updateData.lateCheckOutMinutes = payload.lateCheckOutMinutes
    if (payload.latitude !== undefined) updateData.latitude = payload.latitude
    if (payload.longitude !== undefined) updateData.longitude = payload.longitude
    if (payload.radius !== undefined) updateData.radius = payload.radius
    if (payload.maxMembers !== undefined) updateData.maxMembers = payload.maxMembers

    // Nếu cập nhật managerIds, xoá hết và tạo lại
    if (payload.managerIds !== undefined) {
        await prisma.jobManager.deleteMany({ where: { jobId: input.jobId } })
        if (payload.managerIds.length > 0) {
            updateData.manager = {
                create: payload.managerIds.map((manId) => ({
                    userId: manId,
                })),
            }
        }
    }

    const updated = await prisma.job.update({
        where: { id: input.jobId },
        data: updateData,
        include: INCLUDE_MANAGERS,
    })

    await createAuditLog({
        userId,
        action: 'UPDATE_JOB',
        resource: 'Job',
        resourceId: updated.id,
        oldValue: existing,
        newValue: updated,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật công việc thành công',
        data: updated,
    }
}

// ── Mutation: xoá job (admin) ──
const deleteJob = async (input, userId) => {
    const existing = await prisma.job.findUnique({
        where: { id: input.jobId },
    })
    if (!existing) throw new Error('Công việc không tồn tại')

    await prisma.job.delete({ where: { id: input.jobId } })

    await createAuditLog({
        userId,
        action: 'DELETE_JOB',
        resource: 'Job',
        resourceId: input.jobId,
        oldValue: existing,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá công việc thành công',
    }
}

export default {
    getJobs,
    getJobsByManager,
    getJobsByEmployee,
    createJob,
    updateJob,
    deleteJob,
}
