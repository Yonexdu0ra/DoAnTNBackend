import prisma from '../configs/prismaClient.js'
import { getCache, setCache, invalidateCache, CACHE_KEYS, CACHE_TTL } from '../utils/redisCache.js'

const getStatisticsByAdmin = async () => {
    const cacheKey = CACHE_KEYS.STATISTICS_ADMIN
    const cached = await getCache(cacheKey)
    if (cached) return cached

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
        totalUsers, totalJobs, totalAttendances, totalLeaveRequests,
        totalOvertimeRequests, totalManagers, totalEmployees,
        totalFraudAttendances, totalHolidays,
        totalUsersByMonth, totalJobsByMonth, totalAttendancesByMonth,
        totalLeaveRequestsByMonth, totalOvertimeRequestsByMonth,
        totalFraudAttendancesByMonth, totalHolidaysByMonth,
        totalUsersByDay, totalJobsByDay, totalAttendancesByDay,
        totalLeaveRequestsByDay, totalOvertimeRequestsByDay,
        totalFraudAttendancesByDay, totalHolidaysByDay,
    ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.job.count(),
        prisma.attendance.count(),
        prisma.leaveRequest.count(),
        prisma.overtimeRequest.count(),
        prisma.user.count({ where: { role: 'MANAGER', deletedAt: null } }),
        prisma.user.count({ where: { role: 'EMPLOYEE', deletedAt: null } }),
        prisma.attendance.count({ where: { isFraud: true } }),
        prisma.holiday.count(),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
        prisma.job.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.attendance.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.leaveRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.overtimeRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.attendance.count({ where: { isFraud: true, createdAt: { gte: startOfMonth } } }),
        prisma.holiday.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfDay }, deletedAt: null } }),
        prisma.job.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.attendance.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.leaveRequest.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.overtimeRequest.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.attendance.count({ where: { isFraud: true, createdAt: { gte: startOfDay } } }),
        prisma.holiday.count({ where: { createdAt: { gte: startOfDay } } }),
    ])

    const result = {
        totalUsers, totalJobs, totalAttendances, totalLeaveRequests,
        totalOvertimeRequests, totalManagers, totalEmployees,
        totalFraudAttendances, totalHolidays,
        totalUsersByMonth, totalJobsByMonth, totalAttendancesByMonth,
        totalLeaveRequestsByMonth, totalOvertimeRequestsByMonth,
        totalFraudAttendancesByMonth, totalHolidaysByMonth,
        totalUsersByDay, totalJobsByDay, totalAttendancesByDay,
        totalLeaveRequestsByDay, totalOvertimeRequestsByDay,
        totalFraudAttendancesByDay, totalHolidaysByDay,
    }
    await setCache(cacheKey, result, CACHE_TTL.STATISTICS)
    return result
}

const getStatisticsByManager = async (userId) => {
    const cacheKey = CACHE_KEYS.STATISTICS_MANAGER(userId)
    const cached = await getCache(cacheKey)
    if (cached) return cached

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const managedJobs = await prisma.jobManager.findMany({ where: { userId }, select: { jobId: true } })
    const jobIds = managedJobs.map(j => j.jobId)

    if (jobIds.length === 0) {
        const empty = { totalUsersByJob: 0, totalAttendancesByJob: 0, totalLeaveRequestsByJob: 0, totalOvertimeRequestsByJob: 0, totalFraudAttendancesByJob: 0, totalUsersByJobByMonth: 0, totalAttendancesByJobByMonth: 0, totalLeaveRequestsByJobByMonth: 0, totalOvertimeRequestsByJobByMonth: 0, totalFraudAttendancesByJobByMonth: 0, totalUsersByJobByDay: 0, totalAttendancesByJobByDay: 0, totalLeaveRequestsByJobByDay: 0, totalOvertimeRequestsByJobByDay: 0, totalFraudAttendancesByJobByDay: 0 }
        await setCache(cacheKey, empty, CACHE_TTL.STATISTICS)
        return empty
    }

    const jf = { jobId: { in: jobIds } }
    const [a, b, c, d, e, f, g, h, i, j2, k, l, m, n, o] = await Promise.all([
        prisma.userJoinedJob.count({ where: { ...jf, status: 'APPROVED' } }),
        prisma.attendance.count({ where: jf }),
        prisma.leaveRequest.count({ where: jf }),
        prisma.overtimeRequest.count({ where: jf }),
        prisma.attendance.count({ where: { ...jf, isFraud: true } }),
        prisma.userJoinedJob.count({ where: { ...jf, status: 'APPROVED', createdAt: { gte: startOfMonth } } }),
        prisma.attendance.count({ where: { ...jf, createdAt: { gte: startOfMonth } } }),
        prisma.leaveRequest.count({ where: { ...jf, createdAt: { gte: startOfMonth } } }),
        prisma.overtimeRequest.count({ where: { ...jf, createdAt: { gte: startOfMonth } } }),
        prisma.attendance.count({ where: { ...jf, isFraud: true, createdAt: { gte: startOfMonth } } }),
        prisma.userJoinedJob.count({ where: { ...jf, status: 'APPROVED', createdAt: { gte: startOfDay } } }),
        prisma.attendance.count({ where: { ...jf, createdAt: { gte: startOfDay } } }),
        prisma.leaveRequest.count({ where: { ...jf, createdAt: { gte: startOfDay } } }),
        prisma.overtimeRequest.count({ where: { ...jf, createdAt: { gte: startOfDay } } }),
        prisma.attendance.count({ where: { ...jf, isFraud: true, createdAt: { gte: startOfDay } } }),
    ])

    const result = {
        totalUsersByJob: a, totalAttendancesByJob: b, totalLeaveRequestsByJob: c, totalOvertimeRequestsByJob: d, totalFraudAttendancesByJob: e,
        totalUsersByJobByMonth: f, totalAttendancesByJobByMonth: g, totalLeaveRequestsByJobByMonth: h, totalOvertimeRequestsByJobByMonth: i, totalFraudAttendancesByJobByMonth: j2,
        totalUsersByJobByDay: k, totalAttendancesByJobByDay: l, totalLeaveRequestsByJobByDay: m, totalOvertimeRequestsByJobByDay: n, totalFraudAttendancesByJobByDay: o,
    }
    await setCache(cacheKey, result, CACHE_TTL.STATISTICS)
    return result
}

export default { getStatisticsByAdmin, getStatisticsByManager }
