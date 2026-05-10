import crypto from 'crypto'
import prisma from '../configs/prismaClient.js'
import { getCache, setCache, CACHE_TTL, CACHE_KEYS } from '../utils/redisCache.js'
import { LEAVE_TYPE_VI, ROLE_VI } from '../constants/enumVi.constants.js'
import { toUTCMidnight, getUTCMonthStart, getUTCYearStart } from '../utils/dateUtils.js'

const DEFAULT_ANNUAL_LEAVE_DAYS = 12
const DAY_IN_MS = 24 * 60 * 60 * 1000

const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`
    }

    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort()
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
    }

    return JSON.stringify(value)
}

const hashPayload = (payload) => {
    return crypto.createHash('md5').update(stableStringify(payload || {})).digest('hex').slice(0, 12)
}

const round2 = (value) => Math.round((value || 0) * 100) / 100

const safeRate = (count, total) => {
    if (!total) return 0
    return round2((count / total) * 100)
}

const calcTrendPercent = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0
    return round2(((current - previous) / previous) * 100)
}

const getScopedJobId = (filter) => filter?.jobId || filter?.teamId || null

const getDateRange = (filter) => {
    const now = new Date()
    const fromDate = filter?.fromDate ? new Date(filter.fromDate) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const toDate = filter?.toDate ? new Date(filter.toDate) : now

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new Error('Khoang thoi gian thong ke khong hop le')
    }

    if (fromDate <= toDate) {
        return { fromDate, toDate }
    }

    return { fromDate: toDate, toDate: fromDate }
}

const getPreviousRange = (fromDate, toDate) => {
    const duration = Math.max(DAY_IN_MS, toDate.getTime() - fromDate.getTime() + 1)
    const previousTo = new Date(fromDate.getTime() - 1)
    const previousFrom = new Date(previousTo.getTime() - duration)
    return { previousFrom, previousTo }
}

const getTodayRange = () => {
    const now = new Date()
    const today = toUTCMidnight(now)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    return { today, tomorrow }
}

const getCurrentMonthRange = () => {
    const now = new Date()
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    return { fromDate, toDate }
}

const getCurrentYearRange = () => {
    const now = new Date()
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const toDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
    return { fromDate, toDate }
}

const isFieldRequested = (select, field) => !select || Boolean(select[field])

const getChildSelect = (select, field) => {
    const node = select?.[field]
    if (!node || node === true) return null
    return node.select || null
}

const getWeekKey = (date) => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const weekDay = utcDate.getUTCDay() || 7
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekDay)
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((utcDate - yearStart) / DAY_IN_MS) + 1) / 7)
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const getPeriodKey = (date, trendType = 'MONTH') => {
    const d = new Date(date)
    if (trendType === 'DAY') return d.toISOString().slice(0, 10)
    if (trendType === 'WEEK') return getWeekKey(d)
    if (trendType === 'YEAR') return `${d.getFullYear()}`
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const groupCountByPeriod = (dates, trendType = 'MONTH') => {
    const grouped = new Map()

    for (const date of dates) {
        const key = getPeriodKey(date, trendType)
        grouped.set(key, (grouped.get(key) || 0) + 1)
    }

    return [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, value]) => ({ time, value, label: null }))
}

const groupSumByPeriod = (items, trendType, getDate, getValue) => {
    const grouped = new Map()

    for (const item of items) {
        const date = getDate(item)
        if (!date) continue
        const key = getPeriodKey(date, trendType)
        const value = Number(getValue(item) || 0)
        grouped.set(key, (grouped.get(key) || 0) + value)
    }

    return [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, value]) => ({ time, value: round2(value), label: null }))
}

const countByTypeMap = (rows, typeField, countField = '_count', countKey = 'id') => {
    const map = new Map()
    for (const row of rows) {
        const key = row[typeField]
        const value = row?.[countField]?.[countKey] || 0
        map.set(key, value)
    }
    return map
}

const buildAdminEmployeeWhere = (filter) => {
    const where = {
        deletedAt: null,
        role: 'EMPLOYEE',
    }

    if (filter?.departmentId) {
        where.departmentId = filter.departmentId
    }

    const scopedJobId = getScopedJobId(filter)
    if (scopedJobId) {
        where.userJoinedJobs = {
            some: {
                jobId: scopedJobId,
                status: 'APPROVED',
            },
        }
    }

    return where
}

const buildScopedLeaveWhere = (filter) => {
    const where = {}
    const scopedJobId = getScopedJobId(filter)

    if (scopedJobId) {
        where.jobId = scopedJobId
    }

    if (filter?.departmentId) {
        where.user = { departmentId: filter.departmentId }
    }

    return where
}

const buildScopedAttendanceWhere = (filter) => {
    const where = {}
    const scopedJobId = getScopedJobId(filter)

    if (scopedJobId) {
        where.jobId = scopedJobId
    }

    if (filter?.departmentId) {
        where.user = { departmentId: filter.departmentId }
    }

    return where
}

const sumLeaveDaysInRange = (requests, rangeStart, rangeEnd) => {
    return requests.reduce((total, request) => {
        const requestStart = new Date(request.startDate)
        const requestEnd = new Date(request.endDate)
        const start = new Date(Math.max(requestStart.getTime(), rangeStart.getTime()))
        const end = new Date(Math.min(requestEnd.getTime(), rangeEnd.getTime()))

        if (start > end) return total

        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        const days = Math.floor((end.getTime() - start.getTime()) / DAY_IN_MS) + 1
        return total + Math.max(0, days)
    }, 0)
}

const getJobManningSnapshot = async ({ jobIds, departmentId }) => {
    if (!jobIds.length) {
        return {
            assignmentByJob: new Map(),
            distinctEmployeeCount: 0,
        }
    }

    const membershipWhere = {
        jobId: { in: jobIds },
        status: 'APPROVED',
        ...(departmentId ? { user: { departmentId } } : {}),
    }

    const [assignmentRows, distinctEmployees] = await Promise.all([
        prisma.userJoinedJob.groupBy({
            by: ['jobId'],
            where: membershipWhere,
            _count: { id: true },
        }),
        prisma.userJoinedJob.findMany({
            where: membershipWhere,
            select: { userId: true },
            distinct: ['userId'],
        }),
    ])

    return {
        assignmentByJob: new Map(assignmentRows.map((item) => [item.jobId, item._count.id])),
        distinctEmployeeCount: distinctEmployees.length,
    }
}

const evaluateJobStatusCounts = (jobs, assignmentByJob) => {
    let activeJobs = 0
    let upcomingJobs = 0
    let completedJobs = 0
    let totalManningPercent = 0

    for (const job of jobs) {
        const assignedCount = assignmentByJob.get(job.id) || 0

        if (assignedCount === 0) {
            upcomingJobs += 1
        } else if (job.maxMembers > 0 && assignedCount >= job.maxMembers) {
            completedJobs += 1
        } else {
            activeJobs += 1
        }

        let manningPercent = 0
        if (job.maxMembers > 0) {
            manningPercent = safeRate(Math.min(assignedCount, job.maxMembers), job.maxMembers)
        } else if (assignedCount > 0) {
            manningPercent = 100
        }
        totalManningPercent += manningPercent
    }

    const averageManningLevel = jobs.length ? round2(totalManningPercent / jobs.length) : 0

    return {
        activeJobs,
        upcomingJobs,
        completedJobs,
        averageManningLevel,
    }
}

const buildAdminSummary = async ({ filter, fromDate, toDate, today, tomorrow, select }) => {
    const summary = {}
    const employeeWhere = buildAdminEmployeeWhere(filter)
    const leaveScopeWhere = buildScopedLeaveWhere(filter)

    const needTotalEmployees = isFieldRequested(select, 'totalEmployees')
    const needActiveEmployees = isFieldRequested(select, 'activeEmployees')
    const needInactiveEmployees = isFieldRequested(select, 'inactiveEmployees')
    const needLockedEmployees = isFieldRequested(select, 'lockedEmployees')
    const needEmployeeCounts = needTotalEmployees || needActiveEmployees || needInactiveEmployees || needLockedEmployees

    if (needEmployeeCounts) {
        const [activeEmployees, lockedEmployees] = await Promise.all([
            prisma.user.count({ where: { ...employeeWhere, isLocked: false } }),
            prisma.user.count({ where: { ...employeeWhere, isLocked: true } }),
        ])

        if (needTotalEmployees) summary.totalEmployees = activeEmployees + lockedEmployees
        if (needActiveEmployees) summary.activeEmployees = activeEmployees
        if (needInactiveEmployees) summary.inactiveEmployees = lockedEmployees
        if (needLockedEmployees) summary.lockedEmployees = lockedEmployees
    }

    if (isFieldRequested(select, 'newHiresThisMonth')) {
        const monthStart = getUTCMonthStart(today)
        summary.newHiresThisMonth = await prisma.user.count({
            where: {
                ...employeeWhere,
                createdAt: { gte: monthStart, lt: tomorrow },
            },
        })
    }

    if (isFieldRequested(select, 'leavesAbsences')) {
        summary.leavesAbsences = await prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'APPROVED',
                startDate: { lt: tomorrow },
                endDate: { gte: today },
            },
        })
    }

    if (isFieldRequested(select, 'terminationsThisMonth')) {
        const monthStart = getUTCMonthStart(today)
        summary.terminationsThisMonth = await prisma.user.count({
            where: {
                ...employeeWhere,
                deletedAt: { gte: monthStart, lt: tomorrow },
            },
        })
    }

    if (isFieldRequested(select, 'openJobs')) {
        const scopedJobId = getScopedJobId(filter)
        summary.openJobs = await prisma.job.count({
            where: scopedJobId ? { id: scopedJobId } : undefined,
        })
    }

    if (isFieldRequested(select, 'totalManagers')) {
        summary.totalManagers = await prisma.user.count({
            where: { deletedAt: null, role: 'MANAGER' },
        })
    }

    if (isFieldRequested(select, 'totalDepartments')) {
        summary.totalDepartments = await prisma.department.count()
    }

    if (isFieldRequested(select, 'employeeGrowthPercent')) {
        const { previousFrom, previousTo } = getPreviousRange(fromDate, toDate)
        const [currentCount, previousCount] = await Promise.all([
            prisma.user.count({
                where: {
                    ...employeeWhere,
                    createdAt: { gte: fromDate, lte: toDate },
                },
            }),
            prisma.user.count({
                where: {
                    ...employeeWhere,
                    createdAt: { gte: previousFrom, lte: previousTo },
                },
            }),
        ])

        summary.employeeGrowthPercent = calcTrendPercent(currentCount, previousCount)
    }

    if (isFieldRequested(select, 'leaveTrendPercent')) {
        const { previousFrom, previousTo } = getPreviousRange(fromDate, toDate)
        const [currentCount, previousCount] = await Promise.all([
            prisma.leaveRequest.count({
                where: {
                    ...leaveScopeWhere,
                    createdAt: { gte: fromDate, lte: toDate },
                },
            }),
            prisma.leaveRequest.count({
                where: {
                    ...leaveScopeWhere,
                    createdAt: { gte: previousFrom, lte: previousTo },
                },
            }),
        ])

        summary.leaveTrendPercent = calcTrendPercent(currentCount, previousCount)
    }

    return summary
}

const buildAdminAttendanceStats = async ({ filter, today, tomorrow, select }) => {
    const stats = {}
    const attendanceWhere = {
        ...buildScopedAttendanceWhere(filter),
        date: { gte: today, lt: tomorrow },
    }

    if (isFieldRequested(select, 'todayCheckIns')) {
        stats.todayCheckIns = await prisma.attendance.count({
            where: {
                ...attendanceWhere,
                checkInAt: { not: null },
            },
        })
    }

    if (isFieldRequested(select, 'todayCheckOuts')) {
        stats.todayCheckOuts = await prisma.attendance.count({
            where: {
                ...attendanceWhere,
                checkOutAt: { not: null },
            },
        })
    }

    const needRates = [
        'onTimeRate', 'lateRate', 'absentRate', 'earlyLeaveRate',
        'missingCheckinRate', 'missingCheckoutRate', 'halfDayRate',
        'overtimeRate', 'workFromHomeCount', 'businessTripCount',
        'fraudCount', 'totalRecordsToday',
    ].some((field) => isFieldRequested(select, field))

    if (needRates) {
        const grouped = await prisma.attendance.groupBy({
            by: ['type'],
            where: attendanceWhere,
            _count: { id: true },
        })

        const countMap = countByTypeMap(grouped, 'type')
        const total = grouped.reduce((sum, row) => sum + row._count.id, 0)

        const presentCount = (countMap.get('PRESENT') || 0)
        const lateCount = (countMap.get('LATE') || 0) + (countMap.get('LATE_AND_EARLY') || 0)
        const absentCount = (countMap.get('ABSENT') || 0)
        const earlyLeaveCount = (countMap.get('EARLY_LEAVE') || 0) + (countMap.get('LATE_AND_EARLY') || 0)
        const missingCheckinCount = (countMap.get('MISSING_CHECKIN') || 0)
        const missingCheckoutCount = (countMap.get('MISSING_CHECKOUT') || 0)
        const halfDayCount = (countMap.get('HALF_DAY') || 0)
        const overtimeCount = (countMap.get('OVERTIME') || 0)
        const wfhCount = (countMap.get('WORK_FROM_HOME') || 0)
        const businessTripCount = (countMap.get('BUSINESS_TRIP') || 0)

        if (isFieldRequested(select, 'totalRecordsToday')) stats.totalRecordsToday = total
        if (isFieldRequested(select, 'onTimeRate')) stats.onTimeRate = safeRate(presentCount, total)
        if (isFieldRequested(select, 'lateRate')) stats.lateRate = safeRate(lateCount, total)
        if (isFieldRequested(select, 'absentRate')) stats.absentRate = safeRate(absentCount, total)
        if (isFieldRequested(select, 'earlyLeaveRate')) stats.earlyLeaveRate = safeRate(earlyLeaveCount, total)
        if (isFieldRequested(select, 'missingCheckinRate')) stats.missingCheckinRate = safeRate(missingCheckinCount, total)
        if (isFieldRequested(select, 'missingCheckoutRate')) stats.missingCheckoutRate = safeRate(missingCheckoutCount, total)
        if (isFieldRequested(select, 'halfDayRate')) stats.halfDayRate = safeRate(halfDayCount, total)
        if (isFieldRequested(select, 'overtimeRate')) stats.overtimeRate = safeRate(overtimeCount, total)
        if (isFieldRequested(select, 'workFromHomeCount')) stats.workFromHomeCount = wfhCount
        if (isFieldRequested(select, 'businessTripCount')) stats.businessTripCount = businessTripCount
    }

    if (isFieldRequested(select, 'fraudCount')) {
        stats.fraudCount = await prisma.attendance.count({
            where: { ...attendanceWhere, isFraud: true },
        })
    }

    return stats
}

const buildAdminLeaveStats = async ({ filter, fromDate, toDate, select }) => {
    const leaveStats = {}
    const leaveScopeWhere = buildScopedLeaveWhere(filter)

    if (isFieldRequested(select, 'pendingLeaveRequests')) {
        leaveStats.pendingLeaveRequests = await prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'PENDING',
            },
        })
    }

    if (isFieldRequested(select, 'approvedLeaves')) {
        leaveStats.approvedLeaves = await prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'APPROVED',
                createdAt: { gte: fromDate, lte: toDate },
            },
        })
    }

    if (isFieldRequested(select, 'rejectedLeaves')) {
        leaveStats.rejectedLeaves = await prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'REJECTED',
                createdAt: { gte: fromDate, lte: toDate },
            },
        })
    }

    if (isFieldRequested(select, 'canceledLeaves')) {
        leaveStats.canceledLeaves = await prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'CANCELED',
                createdAt: { gte: fromDate, lte: toDate },
            },
        })
    }

    const needLeaveDays = isFieldRequested(select, 'totalLeaveDaysUsed') || isFieldRequested(select, 'averageLeaveDaysPerEmployee')
    if (needLeaveDays) {
        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                ...leaveScopeWhere,
                status: 'APPROVED',
                startDate: { lte: toDate },
                endDate: { gte: fromDate },
            },
            select: { startDate: true, endDate: true },
        })
        const totalDays = sumLeaveDaysInRange(approvedLeaves, fromDate, toDate)
        if (isFieldRequested(select, 'totalLeaveDaysUsed')) leaveStats.totalLeaveDaysUsed = round2(totalDays)
        if (isFieldRequested(select, 'averageLeaveDaysPerEmployee')) {
            const empCount = await prisma.user.count({ where: buildAdminEmployeeWhere(filter) })
            leaveStats.averageLeaveDaysPerEmployee = empCount ? round2(totalDays / empCount) : 0
        }
    }

    if (isFieldRequested(select, 'leaveTypeDistribution')) {
        const distributionRows = await prisma.leaveRequest.groupBy({
            by: ['leaveType'],
            where: {
                ...leaveScopeWhere,
                createdAt: { gte: fromDate, lte: toDate },
            },
            _count: { id: true },
        })

        const total = distributionRows.reduce((sum, row) => sum + row._count.id, 0)
        leaveStats.leaveTypeDistribution = distributionRows
            .sort((a, b) => b._count.id - a._count.id)
            .map((row) => ({
                label: LEAVE_TYPE_VI[row.leaveType] || row.leaveType,
                value: row._count.id,
                percentage: safeRate(row._count.id, total),
            }))
    }

    if (isFieldRequested(select, 'leaveStatusDistribution')) {
        const statusRows = await prisma.leaveRequest.groupBy({
            by: ['status'],
            where: {
                ...leaveScopeWhere,
                createdAt: { gte: fromDate, lte: toDate },
            },
            _count: { id: true },
        })
        const total = statusRows.reduce((sum, row) => sum + row._count.id, 0)
        leaveStats.leaveStatusDistribution = statusRows
            .sort((a, b) => b._count.id - a._count.id)
            .map((row) => ({
                label: row.status,
                value: row._count.id,
                percentage: safeRate(row._count.id, total),
            }))
    }

    return leaveStats
}

const buildAdminOvertimeStats = async ({ filter, fromDate, toDate, select }) => {
    const stats = {}
    const scopedJobId = getScopedJobId(filter)
    const baseWhere = {
        ...(scopedJobId ? { jobId: scopedJobId } : {}),
        ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
    }

    if (isFieldRequested(select, 'pendingOvertimeRequests')) {
        stats.pendingOvertimeRequests = await prisma.overtimeRequest.count({
            where: { ...baseWhere, status: 'PENDING' },
        })
    }

    if (isFieldRequested(select, 'approvedOvertime')) {
        stats.approvedOvertime = await prisma.overtimeRequest.count({
            where: { ...baseWhere, status: 'APPROVED', createdAt: { gte: fromDate, lte: toDate } },
        })
    }

    if (isFieldRequested(select, 'rejectedOvertime')) {
        stats.rejectedOvertime = await prisma.overtimeRequest.count({
            where: { ...baseWhere, status: 'REJECTED', createdAt: { gte: fromDate, lte: toDate } },
        })
    }

    const needMinutes = isFieldRequested(select, 'totalOvertimeMinutes') || isFieldRequested(select, 'averageOvertimeMinutesPerEmployee')
    if (needMinutes) {
        const result = await prisma.overtimeRequest.aggregate({
            where: { ...baseWhere, status: 'APPROVED', createdAt: { gte: fromDate, lte: toDate } },
            _sum: { minutes: true },
        })
        const totalMinutes = result._sum.minutes || 0
        if (isFieldRequested(select, 'totalOvertimeMinutes')) stats.totalOvertimeMinutes = totalMinutes
        if (isFieldRequested(select, 'averageOvertimeMinutesPerEmployee')) {
            const empCount = await prisma.user.count({ where: buildAdminEmployeeWhere(filter) })
            stats.averageOvertimeMinutesPerEmployee = empCount ? round2(totalMinutes / empCount) : 0
        }
    }

    if (isFieldRequested(select, 'overtimeStatusDistribution')) {
        const statusRows = await prisma.overtimeRequest.groupBy({
            by: ['status'],
            where: { ...baseWhere, createdAt: { gte: fromDate, lte: toDate } },
            _count: { id: true },
        })
        const total = statusRows.reduce((sum, row) => sum + row._count.id, 0)
        stats.overtimeStatusDistribution = statusRows
            .sort((a, b) => b._count.id - a._count.id)
            .map((row) => ({ label: row.status, value: row._count.id, percentage: safeRate(row._count.id, total) }))
    }

    return stats
}

const buildAdminNotificationStats = async ({ select }) => {
    const stats = {}

    if (isFieldRequested(select, 'totalNotifications')) {
        stats.totalNotifications = await prisma.notification.count()
    }

    if (isFieldRequested(select, 'unreadNotifications')) {
        stats.unreadNotifications = await prisma.notification.count({ where: { isRead: false } })
    }

    if (isFieldRequested(select, 'notificationTypeDistribution')) {
        const rows = await prisma.notification.groupBy({
            by: ['type'],
            _count: { id: true },
        })
        const total = rows.reduce((sum, row) => sum + row._count.id, 0)
        stats.notificationTypeDistribution = rows
            .sort((a, b) => b._count.id - a._count.id)
            .map((row) => ({ label: row.type, value: row._count.id, percentage: safeRate(row._count.id, total) }))
    }

    return stats
}

const buildAdminJobOverview = async ({ filter, select }) => {
    const overview = {}
    const scopedJobId = getScopedJobId(filter)
    const jobWhere = scopedJobId ? { id: scopedJobId } : undefined

    const needJobs = [
        'totalJobs', 'activeJobs', 'completedJobs', 'upcomingJobs',
        'totalCapacity', 'assignedEmployees', 'unassignedEmployees', 'averageManningLevel',
    ].some((field) => isFieldRequested(select, field))

    let jobs = []
    let assignmentByJob = new Map()
    let assignedEmployees = 0
    let statusCounts = { activeJobs: 0, upcomingJobs: 0, completedJobs: 0, averageManningLevel: 0 }

    if (needJobs) {
        jobs = await prisma.job.findMany({
            where: jobWhere,
            select: { id: true, maxMembers: true },
        })

        const snapshot = await getJobManningSnapshot({
            jobIds: jobs.map((job) => job.id),
            departmentId: filter?.departmentId,
        })
        assignmentByJob = snapshot.assignmentByJob
        assignedEmployees = snapshot.distinctEmployeeCount
        statusCounts = evaluateJobStatusCounts(jobs, assignmentByJob)
    }

    if (isFieldRequested(select, 'totalJobs')) overview.totalJobs = jobs.length
    if (isFieldRequested(select, 'activeJobs')) overview.activeJobs = statusCounts.activeJobs
    if (isFieldRequested(select, 'completedJobs')) overview.completedJobs = statusCounts.completedJobs
    if (isFieldRequested(select, 'upcomingJobs')) overview.upcomingJobs = statusCounts.upcomingJobs
    if (isFieldRequested(select, 'totalCapacity')) overview.totalCapacity = jobs.reduce((sum, j) => sum + (j.maxMembers || 0), 0)
    if (isFieldRequested(select, 'averageManningLevel')) overview.averageManningLevel = statusCounts.averageManningLevel
    if (isFieldRequested(select, 'assignedEmployees')) overview.assignedEmployees = assignedEmployees

    if (isFieldRequested(select, 'unassignedEmployees')) {
        const activeEmployees = await prisma.user.count({
            where: { ...buildAdminEmployeeWhere(filter), isLocked: false },
        })
        overview.unassignedEmployees = Math.max(0, activeEmployees - assignedEmployees)
    }

    return overview
}

const buildAdminAlerts = async ({ filter, today }) => {
    const leaveScopeWhere = buildScopedLeaveWhere(filter)
    const scopedJobId = getScopedJobId(filter)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const [pendingLeaves, pendingOvertime, upcomingHolidays] = await Promise.all([
        prisma.leaveRequest.count({
            where: {
                ...leaveScopeWhere,
                status: 'PENDING',
            },
        }),
        prisma.overtimeRequest.count({
            where: {
                ...(scopedJobId ? { jobId: scopedJobId } : {}),
                ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                status: 'PENDING',
            },
        }),
        prisma.holiday.findMany({
            where: {
                startDate: { gte: today, lte: nextWeek },
            },
            orderBy: { startDate: 'asc' },
            take: 5,
            select: {
                id: true,
                name: true,
                description: true,
                startDate: true,
            },
        }),
    ])

    const alerts = []

    if (pendingLeaves > 0) {
        alerts.push({
            id: 'pending-leaves',
            type: 'LEAVE',
            title: `${pendingLeaves} leave requests pending approval`,
            description: 'There are leave requests waiting for review',
            severity: pendingLeaves >= 10 ? 'high' : 'medium',
            isRead: false,
        })
    }

    if (pendingOvertime > 0) {
        alerts.push({
            id: 'pending-overtime',
            type: 'OVERTIME',
            title: `${pendingOvertime} overtime requests pending approval`,
            description: 'There are overtime requests waiting for review',
            severity: pendingOvertime >= 10 ? 'high' : 'medium',
            isRead: false,
        })
    }

    for (const holiday of upcomingHolidays) {
        alerts.push({
            id: `holiday-${holiday.id}`,
            type: 'HOLIDAY',
            title: `Upcoming holiday: ${holiday.name}`,
            description: holiday.description || '',
            severity: 'low',
            dueAt: holiday.startDate,
            isRead: false,
        })
    }

    return alerts
}

const buildAdminCharts = async ({ filter, fromDate, toDate, trendType, select }) => {
    const charts = {}
    const employeeWhere = buildAdminEmployeeWhere(filter)
    const leaveScopeWhere = buildScopedLeaveWhere(filter)
    const attendanceScopeWhere = buildScopedAttendanceWhere(filter)

    // Nếu không filter theo ngày, mặc định mốc thời gian cho biểu đồ xu hướng là từ đầu năm đến hiện tại
    const trendFromDate = filter?.fromDate ? fromDate : getUTCYearStart(toDate)

    if (isFieldRequested(select, 'workforceGrowth')) {
        const rows = await prisma.user.findMany({
            where: {
                ...employeeWhere,
                createdAt: { gte: trendFromDate, lte: toDate },
            },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        })

        charts.workforceGrowth = groupCountByPeriod(
            rows.map((row) => row.createdAt),
            trendType,
        )
    }

    if (isFieldRequested(select, 'leaveTrend')) {
        const rows = await prisma.leaveRequest.findMany({
            where: {
                ...leaveScopeWhere,
                createdAt: { gte: trendFromDate, lte: toDate },
            },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        })

        charts.leaveTrend = groupCountByPeriod(
            rows.map((row) => row.createdAt),
            trendType,
        )
    }

    if (isFieldRequested(select, 'departmentDistribution')) {
        const [groups, departments] = await Promise.all([
            prisma.user.groupBy({
                by: ['departmentId'],
                where: {
                    ...employeeWhere,
                    departmentId: { not: null },
                },
                _count: { id: true },
            }),
            prisma.department.findMany({
                select: { id: true, name: true },
            }),
        ])

        const departmentMap = Object.fromEntries(departments.map((item) => [item.id, item.name]))
        const total = groups.reduce((sum, group) => sum + group._count.id, 0)

        charts.departmentDistribution = groups
            .sort((a, b) => b._count.id - a._count.id)
            .map((group) => ({
                label: departmentMap[group.departmentId] || 'Unknown',
                value: group._count.id,
                percentage: safeRate(group._count.id, total),
            }))
    }

    if (isFieldRequested(select, 'roleDistribution')) {
        const roleWhere = {
            deletedAt: null,
            ...(filter?.departmentId ? { departmentId: filter.departmentId } : {}),
        }

        const scopedJobId = getScopedJobId(filter)
        if (scopedJobId) {
            roleWhere.userJoinedJobs = {
                some: {
                    jobId: scopedJobId,
                    status: 'APPROVED',
                },
            }
        }

        const roleGroups = await prisma.user.groupBy({
            by: ['role'],
            where: roleWhere,
            _count: { id: true },
        })

        const total = roleGroups.reduce((sum, row) => sum + row._count.id, 0)
        charts.roleDistribution = roleGroups
            .sort((a, b) => b._count.id - a._count.id)
            .map((row) => ({
                label: ROLE_VI[row.role] || row.role,
                value: row._count.id,
                percentage: safeRate(row._count.id, total),
            }))
    }

    if (isFieldRequested(select, 'attendanceHeatmap')) {
        const rows = await prisma.attendance.findMany({
            where: {
                ...attendanceScopeWhere,
                date: { gte: fromDate, lte: toDate },
            },
            select: { date: true },
            orderBy: { date: 'asc' },
        })

        charts.attendanceHeatmap = groupCountByPeriod(
            rows.map((row) => row.date),
            'DAY',
        )
    }

    if (isFieldRequested(select, 'overtimeTrend')) {
        const scopedJobId = getScopedJobId(filter)
        const rows = await prisma.overtimeRequest.findMany({
            where: {
                ...(scopedJobId ? { jobId: scopedJobId } : {}),
                ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                status: 'APPROVED',
                date: { gte: trendFromDate, lte: toDate },
            },
            select: { date: true, minutes: true },
            orderBy: { date: 'asc' },
        })
        
        // Bạn có thể hiển thị số lượng đơn OT hoặc linh hoạt tính tổng số phút
        charts.overtimeTrend = groupCountByPeriod(rows.map((r) => r.date), trendType)
    }

    if (isFieldRequested(select, 'positionDistribution')) {
        const [groups, positions] = await Promise.all([
            prisma.user.groupBy({
                by: ['positionId'],
                where: { ...employeeWhere, positionId: { not: null } },
                _count: { id: true },
            }),
            prisma.position.findMany({ select: { id: true, name: true } }),
        ])
        const posMap = Object.fromEntries(positions.map((p) => [p.id, p.name]))
        const total = groups.reduce((sum, g) => sum + g._count.id, 0)
        charts.positionDistribution = groups
            .sort((a, b) => b._count.id - a._count.id)
            .map((g) => ({ label: posMap[g.positionId] || 'Unknown', value: g._count.id, percentage: safeRate(g._count.id, total) }))
    }

    if (isFieldRequested(select, 'attendanceTypeTrend')) {
        const rows = await prisma.attendance.findMany({
            where: { ...attendanceScopeWhere, date: { gte: trendFromDate, lte: toDate } },
            select: { date: true, type: true },
            orderBy: { date: 'asc' },
        })
        const seriesMap = new Map()
        for (const row of rows) {
            const t = row.type || 'UNKNOWN'
            if (!seriesMap.has(t)) seriesMap.set(t, [])
            seriesMap.get(t).push(row.date)
        }
        charts.attendanceTypeTrend = [...seriesMap.entries()].map(([name, dates]) => ({
            name,
            data: groupCountByPeriod(dates, trendType),
        }))
    }

    if (isFieldRequested(select, 'fraudTrend')) {
        const rows = await prisma.attendance.findMany({
            where: { ...attendanceScopeWhere, date: { gte: trendFromDate, lte: toDate }, isFraud: true },
            select: { date: true },
            orderBy: { date: 'asc' },
        })
        charts.fraudTrend = groupCountByPeriod(rows.map((r) => r.date), trendType)
    }

    if (isFieldRequested(select, 'genderDistribution')) {
        const rows = await prisma.profile.groupBy({
            by: ['gender'],
            where: { user: employeeWhere },
            _count: { id: true },
        })
        const total = rows.reduce((sum, r) => sum + r._count.id, 0)
        charts.genderDistribution = rows
            .sort((a, b) => b._count.id - a._count.id)
            .map((r) => ({ label: r.gender, value: r._count.id, percentage: safeRate(r._count.id, total) }))
    }

    return charts
}

const buildAdminRecentActivities = async ({ fromDate, toDate }) => {
    const rows = await prisma.auditLog.findMany({
        where: {
            createdAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    })

    // AuditLog has no User relation — fetch user names separately
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))]
    const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, profile: { select: { fullName: true } } },
        })
        : []
    const userMap = new Map(users.map((u) => [u.id, u.profile?.fullName || null]))

    return rows.map((row) => ({
        id: row.id,
        type: row.action,
        title: row.action,
        description: `${row.resource} - ${row.status}`,
        status: row.status,
        createdAt: row.createdAt,
        relatedId: row.resourceId,
        userName: row.userId ? (userMap.get(row.userId) || null) : null,
    }))
}

const buildAdminQuickActions = () => {
    return [
        { key: 'create-user', label: 'Create employee', icon: 'UserPlus', enabled: true, route: '/admin/user' },
        { key: 'create-job', label: 'Create job', icon: 'Briefcase', enabled: true, route: '/admin/job' },
        { key: 'create-holiday', label: 'Create holiday', icon: 'CalendarDays', enabled: true, route: '/admin/holiday' },
        { key: 'view-audit', label: 'View audit logs', icon: 'FileText', enabled: true, route: '/admin/audit' },
    ]
}

// ═══════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════

const getAdminDashboardStatistics = async (filter, select) => {
    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'

    const cacheHash = hashPayload({ filter: filter || {}, select: select || null })
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_ADMIN(cacheHash)

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const data = {}
    const tasks = []

    if (isFieldRequested(select, 'summary')) {
        const summarySelect = getChildSelect(select, 'summary')
        tasks.push(
            buildAdminSummary({ filter, fromDate, toDate, today, tomorrow, select: summarySelect })
                .then((value) => {
                    data.summary = value
                }),
        )
    }

    if (isFieldRequested(select, 'attendanceStats')) {
        const attendanceStatsSelect = getChildSelect(select, 'attendanceStats')
        tasks.push(
            buildAdminAttendanceStats({ filter, today, tomorrow, select: attendanceStatsSelect })
                .then((value) => {
                    data.attendanceStats = value
                }),
        )
    }

    if (isFieldRequested(select, 'leaveStats')) {
        const leaveStatsSelect = getChildSelect(select, 'leaveStats')
        tasks.push(
            buildAdminLeaveStats({ filter, fromDate, toDate, select: leaveStatsSelect })
                .then((value) => {
                    data.leaveStats = value
                }),
        )
    }

    if (isFieldRequested(select, 'jobOverview')) {
        const jobOverviewSelect = getChildSelect(select, 'jobOverview')
        tasks.push(
            buildAdminJobOverview({ filter, select: jobOverviewSelect })
                .then((value) => { data.jobOverview = value }),
        )
    }

    if (isFieldRequested(select, 'overtimeStats')) {
        const overtimeStatsSelect = getChildSelect(select, 'overtimeStats')
        tasks.push(
            buildAdminOvertimeStats({ filter, fromDate, toDate, select: overtimeStatsSelect })
                .then((value) => { data.overtimeStats = value }),
        )
    }

    if (isFieldRequested(select, 'notificationStats')) {
        const notificationStatsSelect = getChildSelect(select, 'notificationStats')
        tasks.push(
            buildAdminNotificationStats({ select: notificationStatsSelect })
                .then((value) => { data.notificationStats = value }),
        )
    }

    if (isFieldRequested(select, 'alerts')) {
        tasks.push(
            buildAdminAlerts({ filter, today })
                .then((value) => { data.alerts = value }),
        )
    }

    if (isFieldRequested(select, 'charts')) {
        const chartsSelect = getChildSelect(select, 'charts')
        tasks.push(
            buildAdminCharts({ filter, fromDate, toDate, trendType, select: chartsSelect })
                .then((value) => { data.charts = value }),
        )
    }

    if (isFieldRequested(select, 'recentActivities')) {
        tasks.push(
            buildAdminRecentActivities({ fromDate, toDate })
                .then((value) => { data.recentActivities = value }),
        )
    }

    if (isFieldRequested(select, 'quickActions')) {
        data.quickActions = buildAdminQuickActions()
    }

    await Promise.all(tasks)

    await setCache(cacheKey, data, CACHE_TTL.STATISTICS)
    return data
}

// ═══════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════

const getManagerDashboardStatistics = async (userId, filter, select) => {
    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'

    const cacheHash = hashPayload({ userId, filter: filter || {}, select: select || null })
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_MANAGER(userId, cacheHash)

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const scopedJobId = getScopedJobId(filter)

    let managedJobIdsPromise
    const getManagedJobIds = async () => {
        if (!managedJobIdsPromise) {
            managedJobIdsPromise = prisma.jobManager.findMany({
                where: {
                    userId,
                    ...(scopedJobId ? { jobId: scopedJobId } : {}),
                },
                select: { jobId: true },
            }).then((rows) => [...new Set(rows.map((row) => row.jobId))])
        }
        return managedJobIdsPromise
    }

    let teamUserIdsPromise
    const getTeamUserIds = async () => {
        if (!teamUserIdsPromise) {
            teamUserIdsPromise = (async () => {
                const managedJobIds = await getManagedJobIds()
                if (!managedJobIds.length) return []

                const rows = await prisma.userJoinedJob.findMany({
                    where: {
                        jobId: { in: managedJobIds },
                        status: 'APPROVED',
                        ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                    },
                    select: { userId: true },
                    distinct: ['userId'],
                })

                return rows.map((row) => row.userId)
            })()
        }
        return teamUserIdsPromise
    }

    let managedJobStatusSummaryPromise
    const getManagedJobStatusSummary = async () => {
        if (!managedJobStatusSummaryPromise) {
            managedJobStatusSummaryPromise = (async () => {
                const managedJobIds = await getManagedJobIds()
                if (!managedJobIds.length) {
                    return {
                        totalManagedJobs: 0,
                        activeJobs: 0,
                        upcomingJobs: 0,
                        completedJobs: 0,
                        averageManningLevel: 0,
                        assignedEmployees: 0,
                    }
                }

                const jobs = await prisma.job.findMany({
                    where: { id: { in: managedJobIds } },
                    select: { id: true, maxMembers: true },
                })

                const snapshot = await getJobManningSnapshot({
                    jobIds: managedJobIds,
                    departmentId: filter?.departmentId,
                })

                const statusCounts = evaluateJobStatusCounts(jobs, snapshot.assignmentByJob)

                return {
                    totalManagedJobs: jobs.length,
                    activeJobs: statusCounts.activeJobs,
                    upcomingJobs: statusCounts.upcomingJobs,
                    completedJobs: statusCounts.completedJobs,
                    averageManningLevel: statusCounts.averageManningLevel,
                    assignedEmployees: snapshot.distinctEmployeeCount,
                }
            })()
        }
        return managedJobStatusSummaryPromise
    }

    let pendingRequestsPromise
    const getPendingRequests = async () => {
        if (!pendingRequestsPromise) {
            pendingRequestsPromise = (async () => {
                const managedJobIds = await getManagedJobIds()
                if (!managedJobIds.length) {
                    return { pendingLeaves: 0, pendingOvertime: 0 }
                }

                const [pendingLeaves, pendingOvertime] = await Promise.all([
                    prisma.leaveRequest.count({
                        where: {
                            jobId: { in: managedJobIds },
                            status: 'PENDING',
                            ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                        },
                    }),
                    prisma.overtimeRequest.count({
                        where: {
                            jobId: { in: managedJobIds },
                            status: 'PENDING',
                            ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                        },
                    }),
                ])

                return { pendingLeaves, pendingOvertime }
            })()
        }

        return pendingRequestsPromise
    }

    const data = {}
    const tasks = []

    if (isFieldRequested(select, 'teamKpi')) {
        const teamKpiSelect = getChildSelect(select, 'teamKpi')
        tasks.push((async () => {
            const teamKpi = {}
            const teamUserIds = await getTeamUserIds()

            if (isFieldRequested(teamKpiSelect, 'totalTeamEmployees')) {
                teamKpi.totalTeamEmployees = teamUserIds.length
            }

            const needAttendanceBreakdown = [
                'presentToday', 'absentToday', 'lateToday', 'onLeaveToday',
                'workFromHomeToday', 'onTimeRate', 'attendanceRate',
            ].some((field) => isFieldRequested(teamKpiSelect, field))

            if (needAttendanceBreakdown) {
                if (!teamUserIds.length) {
                    if (isFieldRequested(teamKpiSelect, 'presentToday')) teamKpi.presentToday = 0
                    if (isFieldRequested(teamKpiSelect, 'absentToday')) teamKpi.absentToday = 0
                    if (isFieldRequested(teamKpiSelect, 'lateToday')) teamKpi.lateToday = 0
                    if (isFieldRequested(teamKpiSelect, 'onLeaveToday')) teamKpi.onLeaveToday = 0
                    if (isFieldRequested(teamKpiSelect, 'workFromHomeToday')) teamKpi.workFromHomeToday = 0
                    if (isFieldRequested(teamKpiSelect, 'onTimeRate')) teamKpi.onTimeRate = 0
                    if (isFieldRequested(teamKpiSelect, 'attendanceRate')) teamKpi.attendanceRate = 0
                } else {
                    const grouped = await prisma.attendance.groupBy({
                        by: ['type'],
                        where: {
                            userId: { in: teamUserIds },
                            date: { gte: today, lt: tomorrow },
                            ...(scopedJobId ? { jobId: scopedJobId } : {}),
                        },
                        _count: { id: true },
                    })

                    const countMap = countByTypeMap(grouped, 'type')
                    const total = grouped.reduce((sum, row) => sum + row._count.id, 0)

                    const presentToday = (countMap.get('PRESENT') || 0) + (countMap.get('EARLY_LEAVE') || 0) + (countMap.get('MISSING_CHECKOUT') || 0)
                    const absentToday = (countMap.get('ABSENT') || 0) + (countMap.get('MISSING_CHECKIN') || 0)
                    const lateToday = (countMap.get('LATE') || 0) + (countMap.get('LATE_AND_EARLY') || 0)
                    const onLeaveToday = (countMap.get('ON_LEAVE') || 0) + (countMap.get('ON_LEAVE_PAID') || 0) + (countMap.get('HOLIDAY') || 0)
                    const wfhToday = (countMap.get('WORK_FROM_HOME') || 0)

                    if (isFieldRequested(teamKpiSelect, 'presentToday')) teamKpi.presentToday = presentToday
                    if (isFieldRequested(teamKpiSelect, 'absentToday')) teamKpi.absentToday = absentToday
                    if (isFieldRequested(teamKpiSelect, 'lateToday')) teamKpi.lateToday = lateToday
                    if (isFieldRequested(teamKpiSelect, 'onLeaveToday')) teamKpi.onLeaveToday = onLeaveToday
                    if (isFieldRequested(teamKpiSelect, 'workFromHomeToday')) teamKpi.workFromHomeToday = wfhToday
                    if (isFieldRequested(teamKpiSelect, 'onTimeRate')) teamKpi.onTimeRate = safeRate(presentToday, total)
                    if (isFieldRequested(teamKpiSelect, 'attendanceRate')) teamKpi.attendanceRate = safeRate(total - absentToday, teamUserIds.length)
                }
            }

            data.teamKpi = teamKpi
        })())
    }

    if (isFieldRequested(select, 'leaveStats')) {
        const leaveStatsSelect = getChildSelect(select, 'leaveStats')
        tasks.push((async () => {
            const leaveStats = {}
            const managedJobIds = await getManagedJobIds()

            if (isFieldRequested(leaveStatsSelect, 'pendingTeamLeaveRequests')) {
                leaveStats.pendingTeamLeaveRequests = managedJobIds.length
                    ? await prisma.leaveRequest.count({
                        where: {
                            jobId: { in: managedJobIds },
                            status: 'PENDING',
                            ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                        },
                    })
                    : 0
            }

            if (isFieldRequested(leaveStatsSelect, 'approvedTeamLeavesThisMonth')) {
                const monthRange = getCurrentMonthRange()
                leaveStats.approvedTeamLeavesThisMonth = managedJobIds.length
                    ? await prisma.leaveRequest.count({
                        where: {
                            jobId: { in: managedJobIds },
                            status: 'APPROVED',
                            createdAt: { gte: monthRange.fromDate, lt: monthRange.toDate },
                            ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                        },
                    })
                    : 0
            }

            if (isFieldRequested(leaveStatsSelect, 'leaveTypeDistribution')) {
                if (!managedJobIds.length) {
                    leaveStats.leaveTypeDistribution = []
                } else {
                    const rows = await prisma.leaveRequest.groupBy({
                        by: ['leaveType'],
                        where: {
                            jobId: { in: managedJobIds },
                            createdAt: { gte: fromDate, lte: toDate },
                            ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                        },
                        _count: { id: true },
                    })

                    const total = rows.reduce((sum, row) => sum + row._count.id, 0)
                    leaveStats.leaveTypeDistribution = rows
                        .sort((a, b) => b._count.id - a._count.id)
                        .map((row) => ({
                            label: LEAVE_TYPE_VI[row.leaveType] || row.leaveType,
                            value: row._count.id,
                            percentage: safeRate(row._count.id, total),
                        }))
                }
            }

            if (isFieldRequested(leaveStatsSelect, 'rejectedTeamLeavesThisMonth')) {
                const monthRange = getCurrentMonthRange()
                leaveStats.rejectedTeamLeavesThisMonth = managedJobIds.length
                    ? await prisma.leaveRequest.count({
                        where: { jobId: { in: managedJobIds }, status: 'REJECTED', createdAt: { gte: monthRange.fromDate, lt: monthRange.toDate }, ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}) },
                    })
                    : 0
            }

            if (isFieldRequested(leaveStatsSelect, 'totalTeamLeaveDaysUsed')) {
                if (!managedJobIds.length) {
                    leaveStats.totalTeamLeaveDaysUsed = 0
                } else {
                    const approved = await prisma.leaveRequest.findMany({
                        where: { jobId: { in: managedJobIds }, status: 'APPROVED', startDate: { lte: toDate }, endDate: { gte: fromDate }, ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}) },
                        select: { startDate: true, endDate: true },
                    })
                    leaveStats.totalTeamLeaveDaysUsed = round2(sumLeaveDaysInRange(approved, fromDate, toDate))
                }
            }

            if (isFieldRequested(leaveStatsSelect, 'leaveStatusDistribution')) {
                if (!managedJobIds.length) {
                    leaveStats.leaveStatusDistribution = []
                } else {
                    const statusRows = await prisma.leaveRequest.groupBy({
                        by: ['status'], where: { jobId: { in: managedJobIds }, createdAt: { gte: fromDate, lte: toDate }, ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}) }, _count: { id: true },
                    })
                    const total = statusRows.reduce((sum, r) => sum + r._count.id, 0)
                    leaveStats.leaveStatusDistribution = statusRows.sort((a, b) => b._count.id - a._count.id)
                        .map((r) => ({ label: r.status, value: r._count.id, percentage: safeRate(r._count.id, total) }))
                }
            }

            data.leaveStats = leaveStats
        })())
    }

    if (isFieldRequested(select, 'attendanceStats')) {
        const attSelect = getChildSelect(select, 'attendanceStats')
        tasks.push((async () => {
            const attStats = {}
            const teamUserIds = await getTeamUserIds()
            const managedJobIds = await getManagedJobIds()
            if (!teamUserIds.length) {
                data.attendanceStats = { totalRecordsInPeriod: 0, onTimeRate: 0, lateRate: 0, absentRate: 0, earlyLeaveRate: 0, fraudCount: 0, attendanceTypeDistribution: [] }
                return
            }
            const attWhere = {
                userId: { in: teamUserIds },
                date: { gte: fromDate, lte: toDate },
                ...(scopedJobId ? { jobId: scopedJobId } : {}),
            }
            const grouped = await prisma.attendance.groupBy({ by: ['type'], where: attWhere, _count: { id: true } })
            const countMap = countByTypeMap(grouped, 'type')
            const total = grouped.reduce((sum, r) => sum + r._count.id, 0)
            if (isFieldRequested(attSelect, 'totalRecordsInPeriod')) attStats.totalRecordsInPeriod = total
            if (isFieldRequested(attSelect, 'onTimeRate')) attStats.onTimeRate = safeRate(countMap.get('PRESENT') || 0, total)
            if (isFieldRequested(attSelect, 'lateRate')) attStats.lateRate = safeRate((countMap.get('LATE') || 0) + (countMap.get('LATE_AND_EARLY') || 0), total)
            if (isFieldRequested(attSelect, 'absentRate')) attStats.absentRate = safeRate(countMap.get('ABSENT') || 0, total)
            if (isFieldRequested(attSelect, 'earlyLeaveRate')) attStats.earlyLeaveRate = safeRate((countMap.get('EARLY_LEAVE') || 0) + (countMap.get('LATE_AND_EARLY') || 0), total)
            if (isFieldRequested(attSelect, 'fraudCount')) {
                attStats.fraudCount = await prisma.attendance.count({ where: { ...attWhere, isFraud: true } })
            }
            if (isFieldRequested(attSelect, 'attendanceTypeDistribution')) {
                attStats.attendanceTypeDistribution = grouped
                    .sort((a, b) => b._count.id - a._count.id)
                    .map((r) => ({ label: r.type, value: r._count.id, percentage: safeRate(r._count.id, total) }))
            }
            data.attendanceStats = attStats
        })())
    }

    if (isFieldRequested(select, 'overtimeStats')) {
        const otSelect = getChildSelect(select, 'overtimeStats')
        tasks.push((async () => {
            const otStats = {}
            const managedJobIds = await getManagedJobIds()
            const deptFilter = filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}
            const baseWhere = managedJobIds.length ? { jobId: { in: managedJobIds }, ...deptFilter } : { id: 'none' }

            if (isFieldRequested(otSelect, 'pendingTeamOvertimeRequests')) {
                otStats.pendingTeamOvertimeRequests = await prisma.overtimeRequest.count({ where: { ...baseWhere, status: 'PENDING' } })
            }
            if (isFieldRequested(otSelect, 'approvedTeamOvertimeThisMonth')) {
                const monthRange = getCurrentMonthRange()
                otStats.approvedTeamOvertimeThisMonth = await prisma.overtimeRequest.count({
                    where: { ...baseWhere, status: 'APPROVED', createdAt: { gte: monthRange.fromDate, lt: monthRange.toDate } },
                })
            }
            if (isFieldRequested(otSelect, 'totalTeamOvertimeMinutes')) {
                const result = await prisma.overtimeRequest.aggregate({
                    where: { ...baseWhere, status: 'APPROVED', createdAt: { gte: fromDate, lte: toDate } },
                    _sum: { minutes: true },
                })
                otStats.totalTeamOvertimeMinutes = result._sum.minutes || 0
            }
            if (isFieldRequested(otSelect, 'overtimeStatusDistribution')) {
                const rows = await prisma.overtimeRequest.groupBy({
                    by: ['status'], where: { ...baseWhere, createdAt: { gte: fromDate, lte: toDate } }, _count: { id: true },
                })
                const total = rows.reduce((sum, r) => sum + r._count.id, 0)
                otStats.overtimeStatusDistribution = rows.sort((a, b) => b._count.id - a._count.id)
                    .map((r) => ({ label: r.status, value: r._count.id, percentage: safeRate(r._count.id, total) }))
            }
            data.overtimeStats = otStats
        })())
    }

    if (isFieldRequested(select, 'jobTaskStatus')) {
        const jobTaskStatusSelect = getChildSelect(select, 'jobTaskStatus')
        tasks.push((async () => {
            const statusSummary = await getManagedJobStatusSummary()
            const jobTaskStatus = {}

            if (isFieldRequested(jobTaskStatusSelect, 'totalManagedJobs')) {
                jobTaskStatus.totalManagedJobs = statusSummary.totalManagedJobs
            }
            if (isFieldRequested(jobTaskStatusSelect, 'activeJobs')) {
                jobTaskStatus.activeJobs = statusSummary.activeJobs
            }
            if (isFieldRequested(jobTaskStatusSelect, 'upcomingJobs')) {
                jobTaskStatus.upcomingJobs = statusSummary.upcomingJobs
            }
            if (isFieldRequested(jobTaskStatusSelect, 'completedJobs')) {
                jobTaskStatus.completedJobs = statusSummary.completedJobs
            }
            if (isFieldRequested(jobTaskStatusSelect, 'averageManningLevel')) {
                jobTaskStatus.averageManningLevel = statusSummary.averageManningLevel
            }
            if (isFieldRequested(jobTaskStatusSelect, 'totalCapacity')) {
                const managedJobIds = await getManagedJobIds()
                const jobs = await prisma.job.findMany({ where: { id: { in: managedJobIds } }, select: { maxMembers: true } })
                jobTaskStatus.totalCapacity = jobs.reduce((sum, j) => sum + (j.maxMembers || 0), 0)
            }
            if (isFieldRequested(jobTaskStatusSelect, 'unassignedEmployees')) {
                const totalEmployees = await prisma.user.count({
                    where: {
                        deletedAt: null,
                        role: 'EMPLOYEE',
                        ...(filter?.departmentId ? { departmentId: filter.departmentId } : {}),
                    },
                })
                jobTaskStatus.unassignedEmployees = Math.max(0, totalEmployees - statusSummary.assignedEmployees)
            }

            data.jobTaskStatus = jobTaskStatus
        })())
    }

    if (isFieldRequested(select, 'alerts')) {
        tasks.push((async () => {
            const alerts = []
            const { pendingLeaves, pendingOvertime } = await getPendingRequests()
            const nextWeek = new Date(today)
            nextWeek.setDate(nextWeek.getDate() + 7)

            if (pendingLeaves > 0) {
                alerts.push({
                    id: 'manager-pending-leaves',
                    type: 'LEAVE',
                    title: `${pendingLeaves} team leave requests pending`,
                    description: 'Review team leave requests',
                    severity: pendingLeaves >= 5 ? 'high' : 'medium',
                    isRead: false,
                })
            }

            if (pendingOvertime > 0) {
                alerts.push({
                    id: 'manager-pending-overtime',
                    type: 'OVERTIME',
                    title: `${pendingOvertime} team overtime requests pending`,
                    description: 'Review team overtime requests',
                    severity: pendingOvertime >= 5 ? 'high' : 'medium',
                    isRead: false,
                })
            }

            const upcomingHolidays = await prisma.holiday.findMany({
                where: {
                    startDate: { gte: today, lte: nextWeek },
                },
                orderBy: { startDate: 'asc' },
                take: 3,
                select: { id: true, name: true, startDate: true, description: true },
            })

            for (const holiday of upcomingHolidays) {
                alerts.push({
                    id: `manager-holiday-${holiday.id}`,
                    type: 'HOLIDAY',
                    title: `Upcoming holiday: ${holiday.name}`,
                    description: holiday.description || '',
                    severity: 'low',
                    dueAt: holiday.startDate,
                    isRead: false,
                })
            }

            data.alerts = alerts
        })())
    }

    if (isFieldRequested(select, 'charts')) {
        const chartsSelect = getChildSelect(select, 'charts')
        tasks.push((async () => {
            const charts = {}
            const teamUserIds = await getTeamUserIds()
            
            const trendFromDate = filter?.fromDate ? fromDate : getUTCYearStart(toDate)

            if (isFieldRequested(chartsSelect, 'teamAttendanceTrend')) {
                if (!teamUserIds.length) {
                    charts.teamAttendanceTrend = []
                } else {
                    const rows = await prisma.attendance.findMany({
                        where: {
                            userId: { in: teamUserIds },
                            date: { gte: trendFromDate, lte: toDate },
                            ...(scopedJobId ? { jobId: scopedJobId } : {}),
                        },
                        select: { date: true },
                        orderBy: { date: 'asc' },
                    })

                    charts.teamAttendanceTrend = groupCountByPeriod(
                        rows.map((row) => row.date),
                        trendType,
                    )
                }
            }

            if (isFieldRequested(chartsSelect, 'teamLeaveTrend')) {
                if (!teamUserIds.length) {
                    charts.teamLeaveTrend = []
                } else {
                    const rows = await prisma.leaveRequest.findMany({
                        where: {
                            userId: { in: teamUserIds },
                            createdAt: { gte: trendFromDate, lte: toDate },
                            ...(scopedJobId ? { jobId: scopedJobId } : {}),
                        },
                        select: { createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    })

                    charts.teamLeaveTrend = groupCountByPeriod(
                        rows.map((row) => row.createdAt),
                        trendType,
                    )
                }
            }

            if (isFieldRequested(chartsSelect, 'teamOvertimeTrend')) {
                if (!teamUserIds.length) { charts.teamOvertimeTrend = [] } else {
                    const rows = await prisma.overtimeRequest.findMany({
                        where: { userId: { in: teamUserIds }, status: 'APPROVED', date: { gte: trendFromDate, lte: toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                        select: { date: true }, orderBy: { date: 'asc' },
                    })
                    charts.teamOvertimeTrend = groupCountByPeriod(rows.map((r) => r.date), trendType)
                }
            }

            if (isFieldRequested(chartsSelect, 'jobStatusDistribution')) {
                const statusSummary = await getManagedJobStatusSummary()
                const total = statusSummary.totalManagedJobs || 1
                charts.jobStatusDistribution = [
                    {
                        label: 'Active',
                        value: statusSummary.activeJobs,
                        percentage: safeRate(statusSummary.activeJobs, total),
                    },
                    {
                        label: 'Upcoming',
                        value: statusSummary.upcomingJobs,
                        percentage: safeRate(statusSummary.upcomingJobs, total),
                    },
                    {
                        label: 'Completed',
                        value: statusSummary.completedJobs,
                        percentage: safeRate(statusSummary.completedJobs, total),
                    },
                ]
            }

            if (isFieldRequested(chartsSelect, 'teamAttendanceTypeTrend')) {
                if (!teamUserIds.length) { charts.teamAttendanceTypeTrend = [] } else {
                    const rows = await prisma.attendance.findMany({
                        where: { userId: { in: teamUserIds }, date: { gte: trendFromDate, lte: toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                        select: { date: true, type: true }, orderBy: { date: 'asc' },
                    })
                    const seriesMap = new Map()
                    for (const row of rows) { const t = row.type || 'UNKNOWN'; if (!seriesMap.has(t)) seriesMap.set(t, []); seriesMap.get(t).push(row.date) }
                    charts.teamAttendanceTypeTrend = [...seriesMap.entries()].map(([name, dates]) => ({ name, data: groupCountByPeriod(dates, trendType) }))
                }
            }

            if (isFieldRequested(chartsSelect, 'teamDepartmentDistribution')) {
                if (!teamUserIds.length) { charts.teamDepartmentDistribution = [] } else {
                    const [groups, departments] = await Promise.all([
                        prisma.user.groupBy({ by: ['departmentId'], where: { id: { in: teamUserIds }, departmentId: { not: null } }, _count: { id: true } }),
                        prisma.department.findMany({ select: { id: true, name: true } }),
                    ])
                    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]))
                    const total = groups.reduce((sum, g) => sum + g._count.id, 0)
                    charts.teamDepartmentDistribution = groups.sort((a, b) => b._count.id - a._count.id).map((g) => ({ label: deptMap[g.departmentId] || 'Unknown', value: g._count.id, percentage: safeRate(g._count.id, total) }))
                }
            }

            if (isFieldRequested(chartsSelect, 'teamWorkingHoursHeatmap')) {
                if (!teamUserIds.length) { charts.teamWorkingHoursHeatmap = [] } else {
                    const rows = await prisma.attendance.findMany({
                        where: { userId: { in: teamUserIds }, date: { gte: trendFromDate, lte: toDate }, checkInAt: { not: null }, checkOutAt: { not: null }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                        select: { date: true, checkInAt: true, checkOutAt: true }, orderBy: { date: 'asc' },
                    })
                    charts.teamWorkingHoursHeatmap = groupSumByPeriod(rows, 'DAY', (r) => r.date, (r) => { const s = new Date(r.checkInAt); const e = new Date(r.checkOutAt); return e > s ? (e - s) / 3600000 : 0 })
                }
            }

            data.charts = charts
        })())
    }

    if (isFieldRequested(select, 'recentActivities')) {
        tasks.push((async () => {
            const managedJobIds = await getManagedJobIds()
            if (!managedJobIds.length) {
                data.recentActivities = []
                return
            }

            const [leaveRows, overtimeRows] = await Promise.all([
                prisma.leaveRequest.findMany({
                    where: {
                        jobId: { in: managedJobIds },
                        ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                    include: {
                        user: {
                            select: {
                                profile: {
                                    select: { fullName: true },
                                },
                            },
                        },
                    },
                }),
                prisma.overtimeRequest.findMany({
                    where: {
                        jobId: { in: managedJobIds },
                        ...(filter?.departmentId ? { user: { departmentId: filter.departmentId } } : {}),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                    include: {
                        user: {
                            select: {
                                profile: {
                                    select: { fullName: true },
                                },
                            },
                        },
                    },
                }),
            ])

            data.recentActivities = [
                ...leaveRows.map((row) => ({
                    id: row.id,
                    type: 'LEAVE_REQUEST',
                    title: `Leave request - ${row.user?.profile?.fullName || 'Unknown'}`,
                    description: row.reason || '',
                    status: row.status,
                    createdAt: row.createdAt,
                    relatedId: row.id,
                    userName: row.user?.profile?.fullName || null,
                })),
                ...overtimeRows.map((row) => ({
                    id: row.id,
                    type: 'OVERTIME_REQUEST',
                    title: `Overtime request - ${row.user?.profile?.fullName || 'Unknown'}`,
                    description: row.reason || '',
                    status: row.status,
                    createdAt: row.createdAt,
                    relatedId: row.id,
                    userName: row.user?.profile?.fullName || null,
                })),
            ]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
        })())
    }

    if (isFieldRequested(select, 'quickActions')) {
        data.quickActions = [
            { key: 'review-leave', label: 'Review leave requests', icon: 'ClipboardCheck', enabled: true, route: '/manager/leave' },
            { key: 'review-overtime', label: 'Review overtime requests', icon: 'Clock', enabled: true, route: '/manager/overtime' },
            { key: 'team-attendance', label: 'Team attendance', icon: 'Users', enabled: true, route: '/manager/attendance' },
            { key: 'managed-jobs', label: 'Managed jobs', icon: 'Briefcase', enabled: true, route: '/manager/job' },
        ]
    }

    await Promise.all(tasks)

    await setCache(cacheKey, data, CACHE_TTL.STATISTICS)
    return data
}

// ═══════════════════════════════════
// EMPLOYEE DASHBOARD
// ═══════════════════════════════════

const getEmployeeDashboardStatistics = async (userId, filter, select) => {
    const { fromDate, toDate } = getDateRange(filter)
    const { today, tomorrow } = getTodayRange()
    const trendType = filter?.trendType || 'MONTH'
    const scopedJobId = getScopedJobId(filter)

    const cacheHash = hashPayload({ userId, filter: filter || {}, select: select || null })
    const cacheKey = CACHE_KEYS.STATISTICS_DASHBOARD_EMPLOYEE(userId, cacheHash)

    const cached = await getCache(cacheKey)
    if (cached) return cached

    let todayAttendancePromise
    const getTodayAttendance = async () => {
        if (!todayAttendancePromise) {
            todayAttendancePromise = prisma.attendance.findFirst({
                where: {
                    userId,
                    date: { gte: today, lt: tomorrow },
                    ...(scopedJobId ? { jobId: scopedJobId } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    type: true,
                    checkInAt: true,
                    checkOutAt: true,
                },
            })
        }
        return todayAttendancePromise
    }

    let pendingRequestsPromise
    const getPendingRequests = async () => {
        if (!pendingRequestsPromise) {
            pendingRequestsPromise = Promise.all([
                prisma.leaveRequest.count({
                    where: {
                        userId,
                        status: 'PENDING',
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                }),
                prisma.overtimeRequest.count({
                    where: {
                        userId,
                        status: 'PENDING',
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                }),
            ]).then(([pendingLeaves, pendingOvertime]) => ({ pendingLeaves, pendingOvertime }))
        }
        return pendingRequestsPromise
    }

    const data = {}
    const tasks = []

    if (isFieldRequested(select, 'personalSummary')) {
        const personalSummarySelect = getChildSelect(select, 'personalSummary')
        tasks.push((async () => {
            const personalSummary = {}

            const needTodayAttendance = [
                'todayAttendanceStatus',
                'todayCheckInTime',
                'todayCheckOutTime',
            ].some((field) => isFieldRequested(personalSummarySelect, field))

            if (needTodayAttendance) {
                const attendance = await getTodayAttendance()
                if (isFieldRequested(personalSummarySelect, 'todayAttendanceStatus')) {
                    personalSummary.todayAttendanceStatus = attendance?.type || null
                }
                if (isFieldRequested(personalSummarySelect, 'todayCheckInTime')) {
                    personalSummary.todayCheckInTime = attendance?.checkInAt || null
                }
                if (isFieldRequested(personalSummarySelect, 'todayCheckOutTime')) {
                    personalSummary.todayCheckOutTime = attendance?.checkOutAt || null
                }
            }

            const needLeaveBalance = isFieldRequested(personalSummarySelect, 'remainingLeaveDays') || isFieldRequested(personalSummarySelect, 'usedLeaveDays')
            if (needLeaveBalance) {
                const yearRange = getCurrentYearRange()
                const approvedLeaves = await prisma.leaveRequest.findMany({
                    where: {
                        userId,
                        status: 'APPROVED',
                        startDate: { lt: yearRange.toDate },
                        endDate: { gte: yearRange.fromDate },
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    select: { startDate: true, endDate: true },
                })

                const usedLeaveDays = round2(sumLeaveDaysInRange(
                    approvedLeaves,
                    yearRange.fromDate,
                    new Date(yearRange.toDate.getTime() - 1),
                ))

                if (isFieldRequested(personalSummarySelect, 'usedLeaveDays')) {
                    personalSummary.usedLeaveDays = usedLeaveDays
                }

                if (isFieldRequested(personalSummarySelect, 'remainingLeaveDays')) {
                    personalSummary.remainingLeaveDays = Math.max(0, round2(DEFAULT_ANNUAL_LEAVE_DAYS - usedLeaveDays))
                }
            }

            if (isFieldRequested(personalSummarySelect, 'todayWorkingHours')) {
                const att = await getTodayAttendance()
                if (att?.checkInAt && att?.checkOutAt) {
                    const s = new Date(att.checkInAt); const e = new Date(att.checkOutAt)
                    personalSummary.todayWorkingHours = e > s ? round2((e - s) / 3600000) : 0
                } else { personalSummary.todayWorkingHours = 0 }
            }

            if (isFieldRequested(personalSummarySelect, 'currentStreakDays')) {
                const recentAttendances = await prisma.attendance.findMany({
                    where: { userId, type: 'PRESENT', date: { lte: today }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                    orderBy: { date: 'desc' }, take: 60, select: { date: true },
                })
                let streak = 0
                const checkDate = new Date(today)
                for (const att of recentAttendances) {
                    const attDate = new Date(att.date); attDate.setHours(0, 0, 0, 0); checkDate.setHours(0, 0, 0, 0)
                    if (attDate.getTime() === checkDate.getTime()) { streak++; checkDate.setDate(checkDate.getDate() - 1) } else break
                }
                personalSummary.currentStreakDays = streak
            }

            if (isFieldRequested(personalSummarySelect, 'totalLeaveDays')) {
                personalSummary.totalLeaveDays = DEFAULT_ANNUAL_LEAVE_DAYS
            }

            if (isFieldRequested(personalSummarySelect, 'pendingLeaveRequests')) {
                const pending = await getPendingRequests()
                personalSummary.pendingLeaveRequests = pending.pendingLeaves
            }

            if (isFieldRequested(personalSummarySelect, 'pendingOvertimeRequests')) {
                const pending = await getPendingRequests()
                personalSummary.pendingOvertimeRequests = pending.pendingOvertime
            }

            if (isFieldRequested(personalSummarySelect, 'totalPendingRequests')) {
                const pending = await getPendingRequests()
                personalSummary.totalPendingRequests = pending.pendingLeaves + pending.pendingOvertime
            }

            if (isFieldRequested(personalSummarySelect, 'activeJobs')) {
                personalSummary.activeJobs = await prisma.userJoinedJob.count({
                    where: { userId, status: 'APPROVED', ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                })
            }

            if (isFieldRequested(personalSummarySelect, 'totalOvertimeMinutesThisMonth')) {
                const monthRange = getCurrentMonthRange()
                const result = await prisma.overtimeRequest.aggregate({
                    where: { userId, status: 'APPROVED', createdAt: { gte: monthRange.fromDate, lt: monthRange.toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                    _sum: { minutes: true },
                })
                personalSummary.totalOvertimeMinutesThisMonth = result._sum.minutes || 0
            }

            if (isFieldRequested(personalSummarySelect, 'monthlyAttendanceRate')) {
                const monthRange = getCurrentMonthRange()
                const [totalDays, presentDays] = await Promise.all([
                    prisma.attendance.count({ where: { userId, date: { gte: monthRange.fromDate, lt: monthRange.toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) } }),
                    prisma.attendance.count({ where: { userId, date: { gte: monthRange.fromDate, lt: monthRange.toDate }, type: { in: ['PRESENT', 'LATE', 'EARLY_LEAVE', 'LATE_AND_EARLY', 'OVERTIME', 'WORK_FROM_HOME'] }, ...(scopedJobId ? { jobId: scopedJobId } : {}) } }),
                ])
                personalSummary.monthlyAttendanceRate = safeRate(presentDays, totalDays)
            }

            data.personalSummary = personalSummary
        })())
    }

    // Monthly Attendance Summary
    if (isFieldRequested(select, 'monthlyAttendance')) {
        tasks.push((async () => {
            const monthRange = getCurrentMonthRange()
            const grouped = await prisma.attendance.groupBy({
                by: ['type'],
                where: { userId, date: { gte: monthRange.fromDate, lt: monthRange.toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                _count: { id: true },
            })
            const countMap = countByTypeMap(grouped, 'type')
            const total = grouped.reduce((sum, r) => sum + r._count.id, 0)
            const presentDays = (countMap.get('PRESENT') || 0)
            const absentDays = (countMap.get('ABSENT') || 0)
            const lateDays = (countMap.get('LATE') || 0) + (countMap.get('LATE_AND_EARLY') || 0)
            const earlyLeaveDays = (countMap.get('EARLY_LEAVE') || 0) + (countMap.get('LATE_AND_EARLY') || 0)
            const onLeaveDays = (countMap.get('ON_LEAVE') || 0) + (countMap.get('ON_LEAVE_PAID') || 0)
            const wfhDays = (countMap.get('WORK_FROM_HOME') || 0)
            const overtimeDays = (countMap.get('OVERTIME') || 0)

            data.monthlyAttendance = {
                totalWorkDays: total,
                presentDays,
                absentDays,
                lateDays,
                earlyLeaveDays,
                onLeaveDays,
                workFromHomeDays: wfhDays,
                overtimeDays,
                attendanceRate: safeRate(total - absentDays, total),
                onTimeRate: safeRate(presentDays, total),
            }
        })())
    }

    // Leave Balance
    if (isFieldRequested(select, 'leaveBalance')) {
        tasks.push((async () => {
            const yearRange = getCurrentYearRange()
            const approved = await prisma.leaveRequest.findMany({
                where: { userId, status: 'APPROVED', startDate: { lt: yearRange.toDate }, endDate: { gte: yearRange.fromDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                select: { startDate: true, endDate: true, leaveType: true },
            })

            const leaveByType = new Map()
            for (const req of approved) {
                const days = sumLeaveDaysInRange([req], yearRange.fromDate, new Date(yearRange.toDate.getTime() - 1))
                const t = req.leaveType
                leaveByType.set(t, (leaveByType.get(t) || 0) + days)
            }

            const usedAnnual = round2(leaveByType.get('ANNUAL') || 0)
            const usedSick = round2(leaveByType.get('SICK') || 0)
            const usedPersonal = round2((leaveByType.get('PERSONAL_PAID') || 0) + (leaveByType.get('PERSONAL_UNPAID') || 0))
            const usedCompensatory = round2(leaveByType.get('COMPENSATORY') || 0)
            const usedUnpaid = round2(leaveByType.get('UNPAID') || 0)
            const totalUsed = round2([...leaveByType.values()].reduce((s, v) => s + v, 0))

            const distribution = [...leaveByType.entries()]
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => ({ label: LEAVE_TYPE_VI[label] || label, value: round2(value), percentage: safeRate(value, totalUsed || 1) }))

            data.leaveBalance = {
                totalAnnualLeave: DEFAULT_ANNUAL_LEAVE_DAYS,
                usedAnnualLeave: usedAnnual,
                remainingAnnualLeave: Math.max(0, round2(DEFAULT_ANNUAL_LEAVE_DAYS - usedAnnual)),
                usedSickLeave: usedSick,
                usedPersonalLeave: usedPersonal,
                usedCompensatoryLeave: usedCompensatory,
                usedUnpaidLeave: usedUnpaid,
                leaveUsageDistribution: distribution,
            }
        })())
    }

    if (isFieldRequested(select, 'alerts')) {
        tasks.push((async () => {
            const alerts = []
            const attendance = await getTodayAttendance()

            if (!attendance) {
                alerts.push({
                    id: 'employee-missing-attendance',
                    type: 'REMINDER',
                    title: 'You have not checked in today',
                    description: 'Please complete your attendance check-in',
                    severity: 'high',
                    isRead: false,
                })
            }

            const pending = await getPendingRequests()
            if (pending.pendingLeaves > 0) {
                alerts.push({
                    id: 'employee-pending-leaves',
                    type: 'LEAVE',
                    title: `${pending.pendingLeaves} leave requests pending`,
                    description: 'Your leave request is waiting for approval',
                    severity: 'low',
                    isRead: false,
                })
            }

            if (pending.pendingOvertime > 0) {
                alerts.push({
                    id: 'employee-pending-overtime',
                    type: 'OVERTIME',
                    title: `${pending.pendingOvertime} overtime requests pending`,
                    description: 'Your overtime request is waiting for approval',
                    severity: 'low',
                    isRead: false,
                })
            }

            const nextTwoWeeks = new Date(today)
            nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14)
            const holidays = await prisma.holiday.findMany({
                where: {
                    startDate: { gte: today, lte: nextTwoWeeks },
                    OR: [
                        { userId: null },
                        { userId },
                    ],
                },
                orderBy: { startDate: 'asc' },
                take: 3,
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                },
            })

            for (const holiday of holidays) {
                alerts.push({
                    id: `employee-holiday-${holiday.id}`,
                    type: 'HOLIDAY',
                    title: `Upcoming holiday: ${holiday.name}`,
                    severity: 'low',
                    dueAt: holiday.startDate,
                    isRead: false,
                })
            }

            data.alerts = alerts
        })())
    }

    if (isFieldRequested(select, 'charts')) {
        const chartsSelect = getChildSelect(select, 'charts')
        tasks.push((async () => {
            const charts = {}

            if (isFieldRequested(chartsSelect, 'attendanceTrend')) {
                const rows = await prisma.attendance.findMany({
                    where: {
                        userId,
                        date: { gte: fromDate, lte: toDate },
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    select: { date: true },
                    orderBy: { date: 'asc' },
                })

                charts.attendanceTrend = groupCountByPeriod(
                    rows.map((row) => row.date),
                    trendType,
                )
            }

            if (isFieldRequested(chartsSelect, 'leaveTrend')) {
                const rows = await prisma.leaveRequest.findMany({
                    where: {
                        userId,
                        createdAt: { gte: fromDate, lte: toDate },
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    select: { createdAt: true },
                    orderBy: { createdAt: 'asc' },
                })

                charts.leaveTrend = groupCountByPeriod(
                    rows.map((row) => row.createdAt),
                    trendType,
                )
            }

            if (isFieldRequested(chartsSelect, 'workingHoursTrend')) {
                const rows = await prisma.attendance.findMany({
                    where: {
                        userId,
                        date: { gte: fromDate, lte: toDate },
                        checkInAt: { not: null },
                        checkOutAt: { not: null },
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    select: {
                        date: true,
                        checkInAt: true,
                        checkOutAt: true,
                    },
                    orderBy: { date: 'asc' },
                })

                charts.workingHoursTrend = groupSumByPeriod(
                    rows,
                    trendType,
                    (row) => row.date,
                    (row) => {
                        const start = new Date(row.checkInAt)
                        const end = new Date(row.checkOutAt)
                        if (end <= start) return 0
                        return (end.getTime() - start.getTime()) / (60 * 60 * 1000)
                    },
                )
            }

            if (isFieldRequested(chartsSelect, 'overtimeTrend')) {
                const otRows = await prisma.overtimeRequest.findMany({
                    where: { userId, status: 'APPROVED', createdAt: { gte: fromDate, lte: toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                    select: { createdAt: true }, orderBy: { createdAt: 'asc' },
                })
                charts.overtimeTrend = groupCountByPeriod(otRows.map((r) => r.createdAt), trendType)
            }

            if (isFieldRequested(chartsSelect, 'attendanceTypeDistribution')) {
                const grouped = await prisma.attendance.groupBy({
                    by: ['type'], where: { userId, date: { gte: fromDate, lte: toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) }, _count: { id: true },
                })
                const total = grouped.reduce((sum, r) => sum + r._count.id, 0)
                charts.attendanceTypeDistribution = grouped.sort((a, b) => b._count.id - a._count.id)
                    .map((r) => ({ label: r.type, value: r._count.id, percentage: safeRate(r._count.id, total) }))
            }

            if (isFieldRequested(chartsSelect, 'leaveTypeDistribution')) {
                const grouped = await prisma.leaveRequest.groupBy({
                    by: ['leaveType'], where: { userId, createdAt: { gte: fromDate, lte: toDate }, ...(scopedJobId ? { jobId: scopedJobId } : {}) }, _count: { id: true },
                })
                const total = grouped.reduce((sum, r) => sum + r._count.id, 0)
                charts.leaveTypeDistribution = grouped.sort((a, b) => b._count.id - a._count.id)
                    .map((r) => ({ label: LEAVE_TYPE_VI[r.leaveType] || r.leaveType, value: r._count.id, percentage: safeRate(r._count.id, total) }))
            }

            if (isFieldRequested(chartsSelect, 'checkInTimeTrend')) {
                const ciRows = await prisma.attendance.findMany({
                    where: { userId, date: { gte: fromDate, lte: toDate }, checkInAt: { not: null }, ...(scopedJobId ? { jobId: scopedJobId } : {}) },
                    select: { date: true, checkInAt: true }, orderBy: { date: 'asc' },
                })
                charts.checkInTimeTrend = ciRows.map((r) => {
                    const d = new Date(r.checkInAt)
                    return { time: new Date(r.date).toISOString().slice(0, 10), value: d.getHours() + d.getMinutes() / 60, label: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
                })
            }

            data.charts = charts
        })())
    }

    if (isFieldRequested(select, 'recentActivities')) {
        tasks.push((async () => {
            const [leaveRows, overtimeRows] = await Promise.all([
                prisma.leaveRequest.findMany({
                    where: {
                        userId,
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                    include: {
                        job: {
                            select: { title: true },
                        },
                    },
                }),
                prisma.overtimeRequest.findMany({
                    where: {
                        userId,
                        ...(scopedJobId ? { jobId: scopedJobId } : {}),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 6,
                    include: {
                        job: {
                            select: { title: true },
                        },
                    },
                }),
            ])

            data.recentActivities = [
                ...leaveRows.map((row) => ({
                    id: row.id,
                    type: 'LEAVE_REQUEST',
                    title: `Leave request - ${row.job?.title || 'N/A'}`,
                    description: row.reason || '',
                    status: row.status,
                    createdAt: row.createdAt,
                    relatedId: row.id,
                    userName: null,
                })),
                ...overtimeRows.map((row) => ({
                    id: row.id,
                    type: 'OVERTIME_REQUEST',
                    title: `Overtime request - ${row.job?.title || 'N/A'}`,
                    description: row.reason || '',
                    status: row.status,
                    createdAt: row.createdAt,
                    relatedId: row.id,
                    userName: null,
                })),
            ]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
        })())
    }

    if (isFieldRequested(select, 'upcomingEvents')) {
        tasks.push((async () => {
            const horizonDate = new Date(today)
            horizonDate.setDate(horizonDate.getDate() + 30)

            const events = await prisma.holiday.findMany({
                where: {
                    startDate: { gte: today, lte: horizonDate },
                    OR: [
                        { userId: null },
                        { userId },
                    ],
                },
                orderBy: { startDate: 'asc' },
                take: 10,
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    type: true,
                    isPaid: true,
                },
            })

            data.upcomingEvents = events.map((event) => ({
                id: event.id,
                title: event.name,
                date: event.startDate,
                endDate: event.endDate,
                type: event.type,
                isPaid: event.isPaid,
            }))
        })())
    }

    if (isFieldRequested(select, 'quickActions')) {
        data.quickActions = [
            { key: 'checkin', label: 'Check in', icon: 'ScanLine', enabled: true, route: '/employee/attendance' },
            { key: 'leave-request', label: 'Create leave request', icon: 'CalendarOff', enabled: true, route: '/employee/leave' },
            { key: 'overtime-request', label: 'Create overtime request', icon: 'Clock', enabled: true, route: '/employee/overtime' },
            { key: 'view-jobs', label: 'View active jobs', icon: 'Briefcase', enabled: true, route: '/employee/job' },
        ]
    }

    await Promise.all(tasks)

    await setCache(cacheKey, data, CACHE_TTL.STATISTICS)
    return data
}

export default {
    getAdminDashboardStatistics,
    getManagerDashboardStatistics,
    getEmployeeDashboardStatistics,
}
