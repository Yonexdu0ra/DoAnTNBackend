import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'

// ── Services ──
import userService from '../../services/user.service.js'
import notificationService from '../../services/notification.service.js'
import holidayService from '../../services/holiday.service.js'
import attendanceService from '../../services/attendance.service.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import jobService from '../../services/job.service.js'
import auditLogService from '../../services/auditLog.service.js'
import departmentService from '../../services/department.service.js'
import positionService from '../../services/position.service.js'
import dashboardService from '../../services/dashboard.service.js'

const getDataSelect = (info) => getSelectPrisma(info)?.select?.data?.select

const queryResolvers = {
    // ═══════════════════════════════════
    // COMMON (ADMIN, MANAGER, EMPLOYEE)
    // ═══════════════════════════════════

    me: withAuthorization('me', ROLE_ACCESS.common, async (_, __, context, info) => {
        const select = getDataSelect(info)
        return userService.me(context.user.id, select)
    }),

    notifications: withAuthorization('notifications', ROLE_ACCESS.common, async (_, args, context, info) => {
        const select = getDataSelect(info)
        return notificationService.getNotifications(
            context.user.id,
            args.pagination,
            args.orderBy,
            args.filter,
            select,
        )
    }),

    holidays: withAuthorization('holidays', ROLE_ACCESS.common, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return holidayService.getHolidays(args.startDate, args.endDate, args.filter, select)
    }),

    // ═══════════════════════════════════
    // EMPLOYEE
    // ═══════════════════════════════════

    attendancesByEmployeeByTime: withAuthorization(
        'attendancesByEmployeeByTime',
        ROLE_ACCESS.common,
        async (_, args, context, info) => {
            const select = getDataSelect(info)
            return attendanceService.getAttendancesByEmployeeByTime(
                context.user.id,
                args.startDate,
                args.endDate,
                args.filter,
                select,
            )
        },
    ),

    attendancesByEmployees: withAuthorization(
        'attendancesByEmployees',
        ROLE_ACCESS.common,
        async (_, args, context, info) => {
            const select = getDataSelect(info)
            return attendanceService.getAttendancesByEmployee(
                context.user.id,
                args.pagination,
                args.orderBy,
                args.filter,
                select,
            )
        },
    ),

    leaveRequestsByEmployee: withAuthorization(
        'leaveRequestsByEmployee',
        ROLE_ACCESS.common,
        async (_, args, context, info) => {
            const select = getDataSelect(info)
            return leaveRequestService.getLeaveRequestsByEmployee(
                context.user.id,
                args.pagination,
                args.orderBy,
                args.filter,
                select,
            )
        },
    ),

    overtimeRequestsByEmployee: withAuthorization(
        'overtimeRequestsByEmployee',
        ROLE_ACCESS.common,
        async (_, args, context, info) => {
            const select = getDataSelect(info)
            return overtimeRequestService.getOvertimeRequestsByEmployee(
                context.user.id,
                args.pagination,
                args.orderBy,
                args.filter,
                select,
            )
        },
    ),

    employeeDashboardStatistics: withAuthorization(
        'employeeDashboardStatistics',
        ROLE_ACCESS.common,
        async (_, args, context) => {
            return dashboardService.getEmployeeDashboardStatistics(context.user.id, args.filter)
        },
    ),

    jobsByEmployee: withAuthorization('jobsByEmployee', ROLE_ACCESS.common, async (_, args, context, info) => {
        const select = getDataSelect(info)
        return jobService.getJobsByEmployee(
            context.user.id,
            args.pagination,
            args.orderBy,
            args.filter,
            select,
        )
    }),

    // ═══════════════════════════════════
    // MANAGER
    // ═══════════════════════════════════

    jobsByManager: withAuthorization('jobsByManager', ROLE_ACCESS.manager, async (_, args, context, info) => {
        const select = getDataSelect(info)
        return jobService.getJobsByManager(
            context.user.id,
            args.pagination,
            args.orderBy,
            args.filter,
            select,
        )
    }),

    usersByJob: withAuthorization('usersByJob', ROLE_ACCESS.manager, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return userService.getUsersByJob(args.jobId, args.pagination, args.orderBy, args.filter, select)
    }),

    leaveRequestsByJob: withAuthorization('leaveRequestsByJob', ROLE_ACCESS.manager, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return leaveRequestService.getLeaveRequestsByJob(
            args.jobId,
            args.pagination,
            args.orderBy,
            args.filter,
            select,
        )
    }),

    searchEmployeesByJob: withAuthorization(
        'searchEmployeesByJob',
        ROLE_ACCESS.manager,
        async (_, args, __, info) => {
            const select = getDataSelect(info)
            return userService.searchEmployeesByJob(
                args.jobId,
                args.pagination,
                args.orderBy,
                args.filter,
                select,
            )
        },
    ),

    overtimeRequestsByJob: withAuthorization(
        'overtimeRequestsByJob',
        ROLE_ACCESS.manager,
        async (_, args, __, info) => {
            const select = getDataSelect(info)
            return overtimeRequestService.getOvertimeRequestsByJob(
                args.jobId,
                args.pagination,
                args.orderBy,
                args.filter,
                select,
            )
        },
    ),

    attendancesByJob: withAuthorization('attendancesByJob', ROLE_ACCESS.manager, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return attendanceService.getAttendancesByJob(
            args.jobId,
            args.pagination,
            args.orderBy,
            args.filter,
            select,
        )
    }),

    managerDashboardStatistics: withAuthorization(
        'managerDashboardStatistics',
        ROLE_ACCESS.manager,
        async (_, args, context) => {
            return dashboardService.getManagerDashboardStatistics(context.user.id, args.filter)
        },
    ),

    // ═══════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════

    searchManager: withAuthorization('searchManager', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return userService.searchManager(args.search, args.filter, select)
    }),

    users: withAuthorization('users', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return userService.getUsers(args.pagination, args.orderBy, args.filter, select)
    }),

    jobs: withAuthorization('jobs', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return jobService.getJobs(args.pagination, args.orderBy, args.filter, select)
    }),

    auditLogs: withAuthorization('auditLogs', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return auditLogService.getAuditLogs(args.pagination, args.orderBy, args.filter, select)
    }),

    holidaysAdmin: withAuthorization('holidaysAdmin', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return holidayService.getHolidaysAdmin(args.pagination, args.orderBy, args.filter, select)
    }),

    departments: withAuthorization('departments', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return departmentService.getDepartments(args.pagination, args.orderBy, args.filter, select)
    }),

    positions: withAuthorization('positions', ROLE_ACCESS.admin, async (_, args, __, info) => {
        const select = getDataSelect(info)
        return positionService.getPositions(args.pagination, args.orderBy, args.filter, select)
    }),

    adminDashboardStatistics: withAuthorization(
        'adminDashboardStatistics',
        ROLE_ACCESS.admin,
        async (_, args) => {
            return dashboardService.getAdminDashboardStatistics(args.filter)
        },
    ),
}

export default queryResolvers
