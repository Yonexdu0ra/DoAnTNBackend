import prisma from '../configs/prismaClient.js'
import { getCache, setCache, CACHE_TTL, CACHE_KEYS } from '../utils/redisCache.js'
import crypto from 'crypto'

// ── Helpers ──

const hashFilter = (filter) => {
    const str = JSON.stringify(filter || {})
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 12)
}

const getDateRange = (filter) => {
    const now = new Date()
    const fromDate = filter?.fromDate ? new Date(filter.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1)
    const toDate = filter?.toDate ? new Date(filter.toDate) : now
    return { fromDate, toDate }
}

const getTodayRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return { today, tomorrow }
}

const groupByTimePeriod = (dates, trendType = 'MONTH') => {
    const grouped = {}

    for (const date of dates) {
        const d = new Date(date)
        let key

        switch (trendType) {
            case 'DAY':
                key = d.toISOString().slice(0, 10)
                break
            case 'WEEK': {
                const oneJan = new Date(d.getFullYear(), 0, 1)
                const weekNum = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7)
                key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
                break
            }
            case 'MONTH':
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                break
            case 'YEAR':
                key = `${d.getFullYear()}`
                break
            default:
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }

        grouped[key] = (grouped[key] || 0) + 1
    }

    return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, value]) => ({ time, value, label: null }))
}

const safeRate = (count, total) => (total === 0 ? 0 : Math.round((count / total) * 10000) / 100)

// ═══════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════

const getAdminDashboardStatistics = async (filter) => {
    const filterHash = hashFilter(filter)
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_ADMIN(filterHash)

    // Check cache
    const cached = await getCache(cacheKey)
    if (cached) return cached

    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'

    // ── Summary ──
    const [totalEmployees, activeEmployees, openJobs] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null, role: 'EMPLOYEE' } }),
        prisma.job.count(),
    ])

    const leavesAbsences = await prisma.leaveRequest.count({
        where: {
            status: 'APPROVED',
            startDate: { lte: tomorrow },
            endDate: { gte: today },
        },
    })

    const summary = { totalEmployees, activeEmployees, leavesAbsences, openJobs }

    // ── Attendance Stats ──
    const todayAttendances = await prisma.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        select: { type: true, checkInAt: true, checkOutAt: true },
    })

    const totalToday = todayAttendances.length
    const todayCheckIns = todayAttendances.filter((a) => a.checkInAt).length
    const todayCheckOuts = todayAttendances.filter((a) => a.checkOutAt).length
    const presentCount = todayAttendances.filter((a) => a.type === 'PRESENT').length
    const lateCount = todayAttendances.filter((a) => ['LATE', 'LATE_AND_EARLY'].includes(a.type)).length
    const absentCount = todayAttendances.filter((a) => a.type === 'ABSENT').length

    const attendanceStats = {
        todayCheckIns,
        todayCheckOuts,
        onTimeRate: safeRate(presentCount, totalToday),
        lateRate: safeRate(lateCount, totalToday),
        absentRate: safeRate(absentCount, totalToday),
    }

    // ── Job Overview ──
    const assignedUserIds = await prisma.userJoinedJob.findMany({
        where: { status: 'APPROVED' },
        select: { userId: true },
        distinct: ['userId'],
    })
    const assignedEmployees = assignedUserIds.length
    const unassignedEmployees = Math.max(0, activeEmployees - assignedEmployees)

    const jobOverview = { openJobs, assignedEmployees, unassignedEmployees }

    // ── Alerts ──
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'PENDING' } })
    const pendingOTs = await prisma.overtimeRequest.count({ where: { status: 'PENDING' } })
    const upcomingHolidays = await prisma.holiday.findMany({
        where: { startDate: { gte: today, lte: new Date(Date.now() + 7 * 86400000) } },
        take: 5,
        orderBy: { startDate: 'asc' },
    })

    const alerts = []
    if (pendingLeaves > 0) {
        alerts.push({
            id: 'pending-leaves',
            type: 'LEAVE',
            title: `${pendingLeaves} yêu cầu nghỉ phép chờ duyệt`,
            description: 'Có yêu cầu nghỉ phép cần xử lý',
            severity: pendingLeaves > 5 ? 'high' : 'medium',
            isRead: false,
        })
    }
    if (pendingOTs > 0) {
        alerts.push({
            id: 'pending-ots',
            type: 'OVERTIME',
            title: `${pendingOTs} yêu cầu OT chờ duyệt`,
            description: 'Có yêu cầu OT cần xử lý',
            severity: pendingOTs > 5 ? 'high' : 'medium',
            isRead: false,
        })
    }
    for (const h of upcomingHolidays) {
        alerts.push({
            id: `holiday-${h.id}`,
            type: 'HOLIDAY',
            title: `Ngày nghỉ sắp tới: ${h.name}`,
            description: h.description || '',
            severity: 'low',
            dueAt: h.startDate,
            isRead: false,
        })
    }

    // ── Charts ──
    const usersCreated = await prisma.user.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate }, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
    })
    const workforceGrowth = groupByTimePeriod(
        usersCreated.map((u) => u.createdAt),
        trendType,
    )

    const leaveRecords = await prisma.leaveRequest.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
    })
    const leaveTrend = groupByTimePeriod(
        leaveRecords.map((l) => l.createdAt),
        trendType,
    )

    // Department distribution
    const deptUsers = await prisma.user.groupBy({
        by: ['departmentId'],
        where: { deletedAt: null, departmentId: { not: null } },
        _count: { id: true },
    })
    const departments = await prisma.department.findMany({
        select: { id: true, name: true },
    })
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]))
    const totalDeptUsers = deptUsers.reduce((sum, d) => sum + d._count.id, 0)
    const departmentDistribution = deptUsers.map((d) => ({
        label: deptMap[d.departmentId] || 'Không xác định',
        value: d._count.id,
        percentage: safeRate(d._count.id, totalDeptUsers),
    }))

    const charts = { workforceGrowth, leaveTrend, departmentDistribution }

    // ── Recent Activities ──
    const recentLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
    })
    const recentActivities = recentLogs.map((log) => ({
        id: log.id,
        type: log.action,
        title: log.action,
        description: `${log.resource} - ${log.status}`,
        status: log.status,
        createdAt: log.createdAt,
        relatedId: log.resourceId,
    }))

    // ── Quick Actions ──
    const quickActions = [
        { key: 'create-user', label: 'Tạo nhân viên', enabled: true, route: '/admin/user' },
        { key: 'create-job', label: 'Tạo công việc', enabled: true, route: '/admin/job' },
        { key: 'create-holiday', label: 'Tạo ngày nghỉ', enabled: true, route: '/admin/holiday' },
        { key: 'view-audit', label: 'Xem nhật ký', enabled: true, route: '/admin/audit' },
    ]

    const result = {
        status: 'success',
        code: 200,
        message: 'Lấy thống kê admin dashboard thành công',
        data: {
            summary,
            attendanceStats,
            jobOverview,
            alerts,
            charts,
            recentActivities,
            quickActions,
        },
    }

    // Cache kết quả
    await setCache(cacheKey, result, CACHE_TTL.STATISTICS)

    return result
}

// ═══════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════

const getManagerDashboardStatistics = async (userId, filter) => {
    const filterHash = hashFilter(filter)
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_MANAGER(userId, filterHash)

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'

    // Lấy jobs mà user quản lý
    const managedJobs = await prisma.jobManager.findMany({
        where: { userId },
        select: { jobId: true },
    })
    const jobIds = managedJobs.map((j) => j.jobId)

    // ── Team KPI ──
    const teamEmployeeIds = await prisma.userJoinedJob.findMany({
        where: { jobId: { in: jobIds }, status: 'APPROVED' },
        select: { userId: true },
        distinct: ['userId'],
    })
    const totalTeamEmployees = teamEmployeeIds.length
    const teamUserIds = teamEmployeeIds.map((t) => t.userId)

    const todayAttendance = await prisma.attendance.count({
        where: {
            userId: { in: teamUserIds },
            date: { gte: today, lt: tomorrow },
            checkInAt: { not: null },
        },
    })

    const teamLeaves = await prisma.leaveRequest.count({
        where: {
            userId: { in: teamUserIds },
            status: 'APPROVED',
            startDate: { lte: tomorrow },
            endDate: { gte: today },
        },
    })

    const teamKpi = { totalTeamEmployees, todayAttendance, teamLeaves }

    // ── Job Task Status ──
    const totalTeamJobs = jobIds.length
    // averageProgress: tỷ lệ nhân viên đã assigned / maxMembers
    const jobDetails = await prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, maxMembers: true },
    })
    let totalProgress = 0
    for (const job of jobDetails) {
        const assigned = await prisma.userJoinedJob.count({
            where: { jobId: job.id, status: 'APPROVED' },
        })
        totalProgress += job.maxMembers > 0 ? safeRate(assigned, job.maxMembers) : 100
    }
    const averageProgress = totalTeamJobs > 0 ? Math.round(totalProgress / totalTeamJobs * 100) / 100 : 0

    const allEmployees = await prisma.user.count({ where: { role: 'EMPLOYEE', deletedAt: null } })
    const unassignedEmployees = Math.max(0, allEmployees - totalTeamEmployees)

    const jobTaskStatus = { totalTeamJobs, averageProgress, unassignedEmployees }

    // ── Alerts ──
    const pendingLeaves = await prisma.leaveRequest.count({
        where: { jobId: { in: jobIds }, status: 'PENDING' },
    })
    const pendingOTs = await prisma.overtimeRequest.count({
        where: { jobId: { in: jobIds }, status: 'PENDING' },
    })

    const alerts = []
    if (pendingLeaves > 0) {
        alerts.push({
            id: 'pending-leaves',
            type: 'LEAVE',
            title: `${pendingLeaves} yêu cầu nghỉ phép chờ duyệt`,
            severity: pendingLeaves > 3 ? 'high' : 'medium',
            isRead: false,
        })
    }
    if (pendingOTs > 0) {
        alerts.push({
            id: 'pending-ots',
            type: 'OVERTIME',
            title: `${pendingOTs} yêu cầu OT chờ duyệt`,
            severity: pendingOTs > 3 ? 'high' : 'medium',
            isRead: false,
        })
    }

    // ── Charts ──
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            jobId: { in: jobIds },
            date: { gte: fromDate, lte: toDate },
        },
        select: { date: true },
        orderBy: { date: 'asc' },
    })
    const attendanceTrend = groupByTimePeriod(
        attendanceRecords.map((a) => a.date),
        trendType,
    )

    // Task distribution: phân bố nhân viên theo job
    const taskDistItems = []
    for (const job of jobDetails) {
        const count = await prisma.userJoinedJob.count({
            where: { jobId: job.id, status: 'APPROVED' },
        })
        taskDistItems.push({ jobId: job.id, count })
    }
    const jobNames = await prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true },
    })
    const jobNameMap = Object.fromEntries(jobNames.map((j) => [j.id, j.title]))
    const totalTaskEmployees = taskDistItems.reduce((s, t) => s + t.count, 0)
    const taskDistribution = taskDistItems.map((t) => ({
        label: jobNameMap[t.jobId] || 'N/A',
        value: t.count,
        percentage: safeRate(t.count, totalTaskEmployees),
    }))

    const charts = { attendanceTrend, taskDistribution }

    // ── Recent Activities ──
    const recentLeaves = await prisma.leaveRequest.findMany({
        where: { jobId: { in: jobIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { include: { profile: true } } },
    })
    const recentOTs = await prisma.overtimeRequest.findMany({
        where: { jobId: { in: jobIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { include: { profile: true } } },
    })

    const recentActivities = [
        ...recentLeaves.map((l) => ({
            id: l.id,
            type: 'LEAVE_REQUEST',
            title: `Yêu cầu nghỉ phép - ${l.user?.profile?.fullName || 'N/A'}`,
            description: l.reason || '',
            status: l.status,
            createdAt: l.createdAt,
            relatedId: l.id,
        })),
        ...recentOTs.map((o) => ({
            id: o.id,
            type: 'OVERTIME_REQUEST',
            title: `Yêu cầu OT - ${o.user?.profile?.fullName || 'N/A'}`,
            description: o.reason || '',
            status: o.status,
            createdAt: o.createdAt,
            relatedId: o.id,
        })),
    ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)

    // ── Quick Actions ──
    const quickActions = [
        { key: 'view-leave', label: 'Xem nghỉ phép', enabled: true, route: '/manager/leave' },
        { key: 'view-overtime', label: 'Xem OT', enabled: true, route: '/manager/overtime' },
        { key: 'view-attendance', label: 'Xem chấm công', enabled: true, route: '/manager/attendance' },
        { key: 'view-jobs', label: 'Xem công việc', enabled: true, route: '/manager/job' },
    ]

    const result = {
        status: 'success',
        code: 200,
        message: 'Lấy thống kê manager dashboard thành công',
        data: {
            teamKpi,
            jobTaskStatus,
            alerts,
            charts,
            recentActivities,
            quickActions,
        },
    }

    await setCache(cacheKey, result, CACHE_TTL.STATISTICS)
    return result
}

// ═══════════════════════════════════
// EMPLOYEE DASHBOARD
// ═══════════════════════════════════

const getEmployeeDashboardStatistics = async (userId, filter) => {
    console.log(userId);
    
    const filterHash = hashFilter(filter)
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_EMPLOYEE(userId, filterHash)

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'

    // ── Personal Summary ──
    const todayAttendance = await prisma.attendance.findFirst({
        where: {
            userId,
            date: { gte: today, lt: tomorrow },
        },
        select: { type: true },
    })
    const todayAttendanceStatus = todayAttendance?.type || null

    // Remaining leave days: 12 ngày phép/năm - đã sử dụng
    const currentYear = new Date().getFullYear()
    const usedLeaves = await prisma.leaveRequest.count({
        where: {
            userId,
            status: 'APPROVED',
            startDate: { gte: new Date(currentYear, 0, 1) },
            endDate: { lte: new Date(currentYear, 11, 31) },
        },
    })
    const remainingLeaveDays = Math.max(0, 12 - usedLeaves)

    const activeJobs = await prisma.userJoinedJob.count({
        where: { userId, status: 'APPROVED' },
    })

    const personalSummary = { todayAttendanceStatus, remainingLeaveDays, activeJobs }

    // ── Alerts ──
    const pendingLeaves = await prisma.leaveRequest.count({
        where: { userId, status: 'PENDING' },
    })
    const pendingOTs = await prisma.overtimeRequest.count({
        where: { userId, status: 'PENDING' },
    })

    const alerts = []
    if (!todayAttendance) {
        alerts.push({
            id: 'no-checkin',
            type: 'REMINDER',
            title: 'Chưa chấm công hôm nay',
            description: 'Hãy chấm công đầu giờ',
            severity: 'high',
            isRead: false,
        })
    }
    if (pendingLeaves > 0) {
        alerts.push({
            id: 'pending-leaves',
            type: 'LEAVE',
            title: `${pendingLeaves} yêu cầu nghỉ phép đang chờ`,
            severity: 'low',
            isRead: false,
        })
    }
    if (pendingOTs > 0) {
        alerts.push({
            id: 'pending-ots',
            type: 'OVERTIME',
            title: `${pendingOTs} yêu cầu OT đang chờ`,
            severity: 'low',
            isRead: false,
        })
    }

    // Ngày nghỉ sắp tới
    const upcomingHolidays = await prisma.holiday.findMany({
        where: { startDate: { gte: today, lte: new Date(Date.now() + 14 * 86400000) } },
        take: 3,
        orderBy: { startDate: 'asc' },
    })
    for (const h of upcomingHolidays) {
        alerts.push({
            id: `holiday-${h.id}`,
            type: 'HOLIDAY',
            title: `Ngày nghỉ: ${h.name}`,
            severity: 'low',
            dueAt: h.startDate,
            isRead: false,
        })
    }

    // ── Charts ──
    const attendanceRecords = await prisma.attendance.findMany({
        where: { userId, date: { gte: fromDate, lte: toDate } },
        select: { date: true },
        orderBy: { date: 'asc' },
    })
    const attendanceTrend = groupByTimePeriod(
        attendanceRecords.map((a) => a.date),
        trendType,
    )

    const leaveRecords = await prisma.leaveRequest.findMany({
        where: { userId, createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
    })
    const leaveTrend = groupByTimePeriod(
        leaveRecords.map((l) => l.createdAt),
        trendType,
    )

    const charts = { attendanceTrend, leaveTrend }

    // ── Recent Activities ──
    const recentLeaves = await prisma.leaveRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { job: true },
    })
    const recentOTs = await prisma.overtimeRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { job: true },
    })

    const recentActivities = [
        ...recentLeaves.map((l) => ({
            id: l.id,
            type: 'LEAVE_REQUEST',
            title: `Nghỉ phép - ${l.job?.title || 'N/A'}`,
            description: l.reason || '',
            status: l.status,
            createdAt: l.createdAt,
            relatedId: l.id,
        })),
        ...recentOTs.map((o) => ({
            id: o.id,
            type: 'OVERTIME_REQUEST',
            title: `OT - ${o.job?.title || 'N/A'}`,
            description: o.reason || '',
            status: o.status,
            createdAt: o.createdAt,
            relatedId: o.id,
        })),
    ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)

    // ── Quick Actions ──
    const quickActions = [
        { key: 'checkin', label: 'Chấm công', enabled: true, route: '/employee/attendance' },
        { key: 'request-leave', label: 'Xin nghỉ phép', enabled: true, route: '/employee/leave' },
        { key: 'request-overtime', label: 'Xin OT', enabled: true, route: '/employee/overtime' },
        { key: 'view-schedule', label: 'Xem lịch', enabled: true, route: '/employee/schedule' },
    ]

    const result = {
        status: 'success',
        code: 200,
        message: 'Lấy thống kê employee dashboard thành công',
        data: {
            personalSummary,
            alerts,
            charts,
            recentActivities,
            quickActions,
        },
    }

    await setCache(cacheKey, result, CACHE_TTL.STATISTICS)
    return result
}

export default {
    getAdminDashboardStatistics,
    getManagerDashboardStatistics,
    getEmployeeDashboardStatistics,
}
