import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import notificationService from '../../services/notification.service.js'
import profileService from '../../services/profile.service.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import attendanceService from '../../services/attendance.service.js'
import userJoinedJobService from '../../services/userJoinedJob.service.js'
import jobService from '../../services/job.service.js'
import jobManagerService from '../../services/jobManager.service.js'
import holidayService from '../../services/holiday.service.js'
import departmentService from '../../services/department.service.js'
import positionService from '../../services/position.service.js'
import userService from '../../services/user.service.js'
import configService from '../../services/config.service.js'

// ═══════════════════════════════════════════
//  MUTATION CHUNG (common – tất cả role)
// ═══════════════════════════════════════════

const markNotificationAsRead = withAuthorization('markNotificationAsRead', ROLE_ACCESS.common, async (_, args, context) => {
    return notificationService.markAsRead(context.user.id, args.input)
})

const markAllNotificationsAsRead = withAuthorization('markAllNotificationsAsRead', ROLE_ACCESS.common, async (_, args, context) => {
    return notificationService.markAllAsRead(context.user.id, args.input)
})

const updateProfile = withAuthorization('updateProfile', ROLE_ACCESS.common, async (_, args, context) => {
    return profileService.updateProfile(context.user.id, args.input)
})

// ═══════════════════════════════════════════
//  MUTATION DÀNH CHO EMPLOYEE
// ═══════════════════════════════════════════

const createLeaveRequest = withAuthorization('createLeaveRequest', ROLE_ACCESS.common, async (_, args, context) => {
    return leaveRequestService.createLeaveRequest(context.user.id, args.input)
})

const createOvertimeRequest = withAuthorization('createOvertimeRequest', ROLE_ACCESS.common, async (_, args, context) => {
    return overtimeRequestService.createOvertimeRequest(context.user.id, args.input)
})

const cancelLeaveRequest = withAuthorization('cancelLeaveRequest', ROLE_ACCESS.common, async (_, args, context) => {
    return leaveRequestService.cancelLeaveRequest(context.user.id, args.input)
})

const cancelOvertimeRequest = withAuthorization('cancelOvertimeRequest', ROLE_ACCESS.common, async (_, args, context) => {
    return overtimeRequestService.cancelOvertimeRequest(context.user.id, args.input)
})

const attendanceByQRCode = withAuthorization('attendanceByQRCode', ROLE_ACCESS.common, async (_, args, context) => {
    const ipAddress = context.ipClient || context.ipAddress
    args.input.ipAddress = ipAddress
    return attendanceService.attendanceByQRCode(context.user.id, args.input)
})

// ═══════════════════════════════════════════
//  MUTATION DÀNH CHO MANAGER
// ═══════════════════════════════════════════

const reviewLeaveRequest = withAuthorization('reviewLeaveRequest', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return leaveRequestService.reviewLeaveRequest(context.user.id, args.input)
})

const createCompensatoryLeaveRequestForEmployee = withAuthorization('createCompensatoryLeaveRequestForEmployee', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return leaveRequestService.createCompensatoryLeaveRequestForEmployee(context.user.id, args.input)
})

const createCompensatoryOvertimeRequestForEmployee = withAuthorization('createCompensatoryOvertimeRequestForEmployee', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return overtimeRequestService.createCompensatoryOvertimeRequestForEmployee(context.user.id, args.input)
})

const createCompensatoryAttendanceForEmployee = withAuthorization('createCompensatoryAttendanceForEmployee', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return attendanceService.createCompensatoryAttendanceForEmployee(context.user, args.input)
})

const reviewOvertimeRequest = withAuthorization('reviewOvertimeRequest', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return overtimeRequestService.reviewOvertimeRequest(context.user.id, args.input)
})

const addEmployeeToJob = withAuthorization('addEmployeeToJob', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return userJoinedJobService.addEmployeeToJob(args.input, context.user.id)
})

const removeEmployeeFromJob = withAuthorization('removeEmployeeFromJob', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return userJoinedJobService.removeEmployeeFromJob(args.input, context.user.id)
})

const reviewAttendanceFraud = withAuthorization('reviewAttendanceFraud', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return attendanceService.reviewAttendanceFraud(args.input, context.user.id)
})

const markAttendanceAsFraudByJob = withAuthorization('markAttendanceAsFraudByJob', ROLE_ACCESS.managerAdmin, async (_, args, context) => {
    return attendanceService.markAttendanceAsFraudByJob(args.input, context.user.id)
})

// ═══════════════════════════════════════════
//  MUTATION DÀNH CHO ADMIN
// ═══════════════════════════════════════════

const createJob = withAuthorization('createJob', ROLE_ACCESS.admin, async (_, args, context) => {
    return jobService.createJob(args.input, context.user.id)
})

const updateJob = withAuthorization('updateJob', ROLE_ACCESS.admin, async (_, args, context) => {
    return jobService.updateJob(args.input, context.user.id)
})

const deleteJob = withAuthorization('deleteJob', ROLE_ACCESS.admin, async (_, args, context) => {
    return jobService.deleteJob(args.input, context.user.id)
})

const addManagerToJob = withAuthorization('addManagerToJob', ROLE_ACCESS.admin, async (_, args, context) => {
    return jobManagerService.addManagerToJob(args.input, context.user.id)
})

const removeManagerFromJob = withAuthorization('removeManagerFromJob', ROLE_ACCESS.admin, async (_, args, context) => {
    return jobManagerService.removeManagerFromJob(args.input, context.user.id)
})

const createHoliday = withAuthorization('createHoliday', ROLE_ACCESS.admin, async (_, args, context) => {
    return holidayService.createHoliday(args.input, context.user.id)
})

const updateHoliday = withAuthorization('updateHoliday', ROLE_ACCESS.admin, async (_, args, context) => {
    return holidayService.updateHoliday(args.input, context.user.id)
})

const deleteHoliday = withAuthorization('deleteHoliday', ROLE_ACCESS.admin, async (_, args, context) => {
    return holidayService.deleteHoliday(args.input, context.user.id)
})

const createDepartment = withAuthorization('createDepartment', ROLE_ACCESS.admin, async (_, args, context) => {
    return departmentService.createDepartment(args.input, context.user.id)
})

const updateDepartment = withAuthorization('updateDepartment', ROLE_ACCESS.admin, async (_, args, context) => {
    return departmentService.updateDepartment(args.input, context.user.id)
})

const deleteDepartment = withAuthorization('deleteDepartment', ROLE_ACCESS.admin, async (_, args, context) => {
    return departmentService.deleteDepartment(args.input, context.user.id)
})

const createPosition = withAuthorization('createPosition', ROLE_ACCESS.admin, async (_, args, context) => {
    return positionService.createPosition(args.input, context.user.id)
})

const updatePosition = withAuthorization('updatePosition', ROLE_ACCESS.admin, async (_, args, context) => {
    return positionService.updatePosition(args.input, context.user.id)
})

const deletePosition = withAuthorization('deletePosition', ROLE_ACCESS.admin, async (_, args, context) => {
    return positionService.deletePosition(args.input, context.user.id)
})

const createUser = withAuthorization('createUser', ROLE_ACCESS.admin, async (_, args, context) => {
    return userService.createUser(args.input, context.user.id)
})

const updateUser = withAuthorization('updateUser', ROLE_ACCESS.admin, async (_, args, context) => {
    return userService.updateUser(args.input, context.user.id)
})

const deleteUser = withAuthorization('deleteUser', ROLE_ACCESS.admin, async (_, args, context) => {
    return userService.deleteUser(args.input, context.user.id)
})

const resetUserPassword = withAuthorization('resetUserPassword', ROLE_ACCESS.admin, async (_, args, context) => {
    return userService.resetUserPassword(args.input, context.user.id)
})

const createConfig = withAuthorization('createConfig', ROLE_ACCESS.admin, async (_, args, context) => {
    return configService.createConfig(args.input, context.user.id)
})

const updateConfig = withAuthorization('updateConfig', ROLE_ACCESS.admin, async (_, args, context) => {
    return configService.updateConfig(args.input, context.user.id)
})

const deleteConfig = withAuthorization('deleteConfig', ROLE_ACCESS.admin, async (_, args, context) => {
    return configService.deleteConfig(args.input, context.user.id)
})

const toggleLockUser = withAuthorization('toggleLockUser', ROLE_ACCESS.admin, async (_, args, context) => {
    return userService.toggleLockUser(args.input, context.user.id)
})

// ═══════════════════════════════════════════

const mutationResolvers = {
    // common
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateProfile,

    // employee
    createLeaveRequest,
    createOvertimeRequest,
    cancelLeaveRequest,
    cancelOvertimeRequest,
    attendanceByQRCode,

    // manager
    reviewLeaveRequest,
    createCompensatoryLeaveRequestForEmployee,
    createCompensatoryOvertimeRequestForEmployee,
    createCompensatoryAttendanceForEmployee,
    reviewOvertimeRequest,
    addEmployeeToJob,
    removeEmployeeFromJob,
    reviewAttendanceFraud,
    markAttendanceAsFraudByJob,

    // admin
    createJob,
    updateJob,
    deleteJob,
    addManagerToJob,
    removeManagerFromJob,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createPosition,
    updatePosition,
    deletePosition,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    createConfig,
    updateConfig,
    deleteConfig,
    toggleLockUser,
}

export default mutationResolvers
