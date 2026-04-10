import prisma from '../configs/prismaClient.js'
import { createAuditLog } from '../utils/auditLog.js'

// ── Mutation: thêm manager vào job (admin) ──
const addManagerToJob = async (input, adminUserId) => {
    const job = await prisma.job.findUnique({ where: { id: input.jobId } })
    if (!job) throw new Error('Công việc không tồn tại')

    // Tạo từng record, bỏ qua nếu đã tồn tại
    const results = []
    for (const userId of input.userIds) {
        const exists = await prisma.jobManager.findFirst({
            where: { jobId: input.jobId, userId },
        })
        if (exists) continue

        const jm = await prisma.jobManager.create({
            data: { jobId: input.jobId, userId },
            include: {
                job: true,
                user: { include: { profile: true } },
            },
        })
        results.push(jm)
    }

    await createAuditLog({
        userId: adminUserId,
        action: 'ADD_MANAGER_TO_JOB',
        resource: 'JobManager',
        resourceId: input.jobId,
        newValue: { userIds: input.userIds },
    })

    return {
        status: 'success',
        code: 201,
        message: 'Thêm manager vào công việc thành công',
        data: results[0] || null,
    }
}

// ── Mutation: xoá manager khỏi job (admin) ──
const removeManagerFromJob = async (input, adminUserId) => {
    await prisma.jobManager.deleteMany({
        where: {
            jobId: input.jobId,
            userId: { in: input.userIds },
        },
    })

    await createAuditLog({
        userId: adminUserId,
        action: 'REMOVE_MANAGER_FROM_JOB',
        resource: 'JobManager',
        resourceId: input.jobId,
        oldValue: { userIds: input.userIds },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá manager khỏi công việc thành công',
        data: null,
    }
}

export default {
    addManagerToJob,
    removeManagerFromJob,
}
