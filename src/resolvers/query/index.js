import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import userService from '../../services/user.service.js'
import notificationService from '../../services/notification.service.js'
import attendanceService from '../../services/attendance.service.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import holidayService from '../../services/holiday.service.js'
import jobService from '../../services/job.service.js'
import departmentService from '../../services/department.service.js'
import positionService from '../../services/position.service.js'
import configService from '../../services/config.service.js'
import auditLogService from '../../services/auditLog.service.js'
import dashboardService from '../../services/dashboard.service.js'
import userJoinedJobService from '../../services/userJoinedJob.service.js'

// ═══════════════════════════════════════════
//  QUERY CHUNG (common – tất cả role)
// ═══════════════════════════════════════════

const me = withAuthorization('me', ROLE_ACCESS.common, async (_, __, context, info) => {
    const select = getSelectPrisma(info)?.select
    return userService.me(context.user.id, select)
})

const totalMemberJoinedByJobId = withAuthorization('totalMemberJoinedByJobId', ROLE_ACCESS.common, async (_, args, context, info) => {
    return userJoinedJobService.getTotalMemberJoinedByJobId(args.jobId)
})

const totalMemberJoinedByJobIds = withAuthorization('totalMemberJoinedByJobIds', ROLE_ACCESS.common, async (_, args, context, info) => {
    return userJoinedJobService.getTotalMemberJoinedByJobIds(args.jobIds)
})

const notifications = withAuthorization('notifications', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return notificationService.getNotifications(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const holidays = withAuthorization('holidays', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return holidayService.getHolidays(args.startDate, args.endDate, args.filter, select)
})

// ═══════════════════════════════════════════
//  QUERY DÀNH CHO EMPLOYEE
// ═══════════════════════════════════════════

const attendancesByEmployeeByTime = withAuthorization('attendancesByEmployeeByTime', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return attendanceService.getAttendancesByEmployeeByTime(
        context.user.id,
        args.startDate,
        args.endDate,
        args.filter,
        select,
    )
})

const attendancesByEmployees = withAuthorization('attendancesByEmployees', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return attendanceService.getAttendancesByEmployee(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const leaveRequestsByEmployee = withAuthorization('leaveRequestsByEmployee', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return leaveRequestService.getLeaveRequestsByEmployee(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const overtimeRequestsByEmployee = withAuthorization('overtimeRequestsByEmployee', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return overtimeRequestService.getOvertimeRequestsByEmployee(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const employeeDashboardStatistics = withAuthorization('employeeDashboardStatistics', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return dashboardService.getEmployeeDashboardStatistics(context.user.id, args.filter, select)
})

const jobsByEmployee = withAuthorization('jobsByEmployee', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return jobService.getJobsByEmployee(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

// ═══════════════════════════════════════════
//  QUERY LẤY THÔNG TIN ĐƠN LẺ THEO ID
//  (của user đó / manager quản lý job đó / admin)
// ═══════════════════════════════════════════

const attendanceById = withAuthorization('attendanceById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return attendanceService.getAttendanceById(args.id, context.user.id, select)
})

const leaveRequestById = withAuthorization('leaveRequestById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return leaveRequestService.getLeaveRequestById(args.id, context.user.id, select)
})

const overtimeRequestById = withAuthorization('overtimeRequestById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return overtimeRequestService.getOvertimeRequestById(args.id, context.user.id, select)
})

const jobById = withAuthorization('jobById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return jobService.getJobById(args.id, context.user.id, select)
})

const notificationById = withAuthorization('notificationById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return notificationService.getNotificationById(args.id, context.user.id, select)
})

const holidayById = withAuthorization('holidayById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return holidayService.getHolidayById(args.id, select)
})

const departmentById = withAuthorization('departmentById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return departmentService.getDepartmentById(args.id, select)
})

const positionById = withAuthorization('positionById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return positionService.getPositionById(args.id, select)
})

const userById = withAuthorization('userById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return userService.getUserById(args.id, select)
})

const configById = withAuthorization('configById', ROLE_ACCESS.common, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return configService.getConfigByKey(args.key, select)
})

// ═══════════════════════════════════════════
//  QUERY DÀNH CHO MANAGER
// ═══════════════════════════════════════════

const jobsByManager = withAuthorization('jobsByManager', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return jobService.getJobsByManager(
        context.user.id,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const usersByJob = withAuthorization('usersByJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.getUsersByJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const leaveRequestsByJob = withAuthorization('leaveRequestsByJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return leaveRequestService.getLeaveRequestsByJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const searchEmployeesNotInJob = withAuthorization('searchEmployeesNotInJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.searchEmployeesNotInJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const searchEmployeesByJob = withAuthorization('searchEmployeesByJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.searchEmployeesByJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const overtimeRequestsByJob = withAuthorization('overtimeRequestsByJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return overtimeRequestService.getOvertimeRequestsByJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const attendancesByJob = withAuthorization('attendancesByJob', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return attendanceService.getAttendancesByJob(
        args.jobId,
        args.pagination,
        args.orderBy,
        args.filter,
        select,
    )
})

const managerDashboardStatistics = withAuthorization('managerDashboardStatistics', ROLE_ACCESS.managerAdmin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return dashboardService.getManagerDashboardStatistics(context.user.id, args.filter, select)
})

// ═══════════════════════════════════════════
//  QUERY DÀNH CHO ADMIN
// ═══════════════════════════════════════════

const searchManager = withAuthorization('searchManager', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.searchManager(args.search, args.filter, select)
})

const searchUser = withAuthorization('searchUser', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.searchUser(args.search, args.pagination, args.orderBy, args.filter, select)
})

const users = withAuthorization('users', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return userService.getUsers(args.pagination, args.orderBy, args.filter, select)
})

const jobs = withAuthorization('jobs', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return jobService.getJobs(args.pagination, args.orderBy, args.filter, select)
})

const auditLogs = withAuthorization('auditLogs', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return auditLogService.getAuditLogs(args.pagination, args.orderBy, args.filter, select)
})

const holidaysAdmin = withAuthorization('holidaysAdmin', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return holidayService.getHolidaysAdmin(args.pagination, args.orderBy, args.filter, select)
})

const departments = withAuthorization('departments', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return departmentService.getDepartments(args.pagination, args.orderBy, args.filter, select)
})

const positions = withAuthorization('positions', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return positionService.getPositions(args.pagination, args.orderBy, args.filter, select)
})

const adminDashboardStatistics = withAuthorization('adminDashboardStatistics', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select
    return dashboardService.getAdminDashboardStatistics(args.filter, select)
})

const configs = withAuthorization('configs', ROLE_ACCESS.admin, async (_, args, context, info) => {
    const select = getSelectPrisma(info)?.select?.nodes?.select
    return configService.getConfigs(args.pagination, args.orderBy, args.filter, select)
})

// ═══════════════════════════════════════════

const queryResolvers = {
    // common
    me,
    totalMemberJoinedByJobId,
    totalMemberJoinedByJobIds,
    notifications,
    holidays,

    // employee
    attendancesByEmployeeByTime,
    attendancesByEmployees,
    leaveRequestsByEmployee,
    overtimeRequestsByEmployee,
    employeeDashboardStatistics,
    jobsByEmployee,

    // lấy thông tin đơn lẻ theo ID (user/manager/admin)
    attendanceById,
    leaveRequestById,
    overtimeRequestById,
    jobById,
    notificationById,
    holidayById,
    departmentById,
    positionById,
    userById,
    configById,

    // manager
    jobsByManager,
    usersByJob,
    leaveRequestsByJob,
    searchEmployeesNotInJob,
    searchEmployeesByJob,
    overtimeRequestsByJob,
    attendancesByJob,
    managerDashboardStatistics,

    // admin
    searchManager,
    searchUser,
    users,
    jobs,
    auditLogs,
    holidaysAdmin,
    departments,
    positions,
    adminDashboardStatistics,
    configs,
}

export default queryResolvers
