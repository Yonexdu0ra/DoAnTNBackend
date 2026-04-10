import prisma from '../configs/prismaClient.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'
import { createAndPublishNotification } from './notification.service.js'

// ── Mutation: thêm employee vào job (manager) ──
const addEmployeeToJob = async (input, managerUserId) => {
    const job = await prisma.job.findUnique({ where: { id: input.jobId } })
    if (!job) throw new Error('Công việc không tồn tại')

    // Kiểm tra manager có quản lý job này không
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: input.jobId, userId: managerUserId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    // Kiểm tra số lượng thành viên
    const currentCount = await prisma.userJoinedJob.count({
        where: { jobId: input.jobId, status: 'APPROVED' },
    })
    if (job.maxMembers > 0 && currentCount + input.userIds.length > job.maxMembers) {
        throw new Error(`Công việc này chỉ cho phép tối đa ${job.maxMembers} thành viên`)
    }

    const results = []
    for (const userId of input.userIds) {
        // Upsert: nếu đã tồn tại thì cập nhật status
        const ujj = await prisma.userJoinedJob.upsert({
            where: {
                idx_user_job: { userId, jobId: input.jobId },
            },
            update: { status: 'APPROVED' },
            create: {
                userId,
                jobId: input.jobId,
                status: 'APPROVED',
            },
            include: {
                user: { include: { profile: true } },
                job: true,
            },
        })
        results.push(ujj)

        // Thông báo cho employee
        await createAndPublishNotification({
            userId,
            title: 'Bạn được thêm vào công việc',
            content: `Bạn đã được thêm vào công việc "${job.title}"`,
            type: 'SYSTEM',
            refType: 'JOB',
            refId: job.id,
        })
    }

    // Publish cho manager (cập nhật danh sách nhân viên)
    pubsub.publish(EVENTS.EMPLOYEE_IN_JOB_UPDATED(input.jobId), {
        managerReceivedUserJoinedJob: {
            status: 'success',
            code: 200,
            message: 'Nhân viên đã được thêm vào công việc',
            data: results[0] || null,
        },
    })

    return {
        status: 'success',
        code: 201,
        message: 'Thêm nhân viên vào công việc thành công',
        data: results[0] || null,
    }
}

// ── Mutation: xoá employee khỏi job (manager) ──
const removeEmployeeFromJob = async (input, managerUserId) => {
    const job = await prisma.job.findUnique({ where: { id: input.jobId } })
    if (!job) throw new Error('Công việc không tồn tại')

    // Kiểm tra manager
    const isManager = await prisma.jobManager.findFirst({
        where: { jobId: input.jobId, userId: managerUserId },
    })
    if (!isManager) throw new Error('Bạn không phải manager của công việc này')

    for (const userId of input.userIds) {
        await prisma.userJoinedJob.deleteMany({
            where: { userId, jobId: input.jobId },
        })

        // Thông báo cho employee
        await createAndPublishNotification({
            userId,
            title: 'Bạn đã bị xoá khỏi công việc',
            content: `Bạn đã bị xoá khỏi công việc "${job.title}"`,
            type: 'SYSTEM',
            refType: 'JOB',
            refId: job.id,
        })
    }

    // Publish cho manager
    pubsub.publish(EVENTS.EMPLOYEE_IN_JOB_UPDATED(input.jobId), {
        managerReceivedUserJoinedJob: {
            status: 'success',
            code: 200,
            message: 'Nhân viên đã bị xoá khỏi công việc',
            data: null,
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá nhân viên khỏi công việc thành công',
        data: null,
    }
}

export default {
    addEmployeeToJob,
    removeEmployeeFromJob,
}
