import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'

// ── Services ──
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

const mutationResolvers = {
    // ═══════════════════════════════════
    // COMMON (ADMIN, MANAGER, EMPLOYEE)
    // ═══════════════════════════════════

    markNotificationAsRead: withAuthorization(
        'markNotificationAsRead',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return notificationService.markAsRead(context.user.id, input)
        },
    ),

    markAllNotificationsAsRead: withAuthorization(
        'markAllNotificationsAsRead',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return notificationService.markAllAsRead(context.user.id, input)
        },
    ),

    updateProfile: withAuthorization(
        'updateProfile',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return profileService.updateProfile(context.user.id, input)
        },
    ),

    // ═══════════════════════════════════
    // EMPLOYEE
    // ═══════════════════════════════════

    createLeaveRequest: withAuthorization(
        'createLeaveRequest',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return leaveRequestService.createLeaveRequest(context.user.id, input)
        },
    ),

    createOvertimeRequest: withAuthorization(
        'createOvertimeRequest',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return overtimeRequestService.createOvertimeRequest(context.user.id, input)
        },
    ),

    cancelLeaveRequest: withAuthorization(
        'cancelLeaveRequest',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return leaveRequestService.cancelLeaveRequest(context.user.id, input)
        },
    ),

    cancelOvertimeRequest: withAuthorization(
        'cancelOvertimeRequest',
        ROLE_ACCESS.common,
        async (_, { input }, context) => {
            return overtimeRequestService.cancelOvertimeRequest(context.user.id, input)
        },
    ),

    // ═══════════════════════════════════
    // MANAGER
    // ═══════════════════════════════════

    reviewLeaveRequest: withAuthorization(
        'reviewLeaveRequest',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return leaveRequestService.reviewLeaveRequest(context.user.id, input)
        },
    ),

    createCompensatoryLeaveRequestForEmployee: withAuthorization(
        'createCompensatoryLeaveRequestForEmployee',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return leaveRequestService.createCompensatoryLeaveRequestForEmployee(context.user.id, input)
        },
    ),

    createCompensatoryOvertimeRequestForEmployee: withAuthorization(
        'createCompensatoryOvertimeRequestForEmployee',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return overtimeRequestService.createCompensatoryOvertimeRequestForEmployee(context.user.id, input)
        },
    ),

    reviewOvertimeRequest: withAuthorization(
        'reviewOvertimeRequest',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return overtimeRequestService.reviewOvertimeRequest(context.user.id, input)
        },
    ),

    addEmployeeToJob: withAuthorization(
        'addEmployeeToJob',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return userJoinedJobService.addEmployeeToJob(input, context.user.id)
        },
    ),

    removeEmployeeFromJob: withAuthorization(
        'removeEmployeeFromJob',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return userJoinedJobService.removeEmployeeFromJob(input, context.user.id)
        },
    ),

    reviewAttendanceFraud: withAuthorization(
        'reviewAttendanceFraud',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return attendanceService.reviewAttendanceFraud(input, context.user.id)
        },
    ),

    markAttendanceAsFraudByJob: withAuthorization(
        'markAttendanceAsFraudByJob',
        ROLE_ACCESS.manager,
        async (_, { input }, context) => {
            return attendanceService.markAttendanceAsFraudByJob(input, context.user.id)
        },
    ),

    // ═══════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════

    createJob: withAuthorization('createJob', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return jobService.createJob(input, context.user.id)
    }),

    updateJob: withAuthorization('updateJob', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return jobService.updateJob(input, context.user.id)
    }),

    deleteJob: withAuthorization('deleteJob', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return jobService.deleteJob(input, context.user.id)
    }),

    addManagerToJob: withAuthorization('addManagerToJob', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return jobManagerService.addManagerToJob(input, context.user.id)
    }),

    removeManagerFromJob: withAuthorization(
        'removeManagerFromJob',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return jobManagerService.removeManagerFromJob(input, context.user.id)
        },
    ),

    createHoliday: withAuthorization('createHoliday', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return holidayService.createHoliday(input, context.user.id)
    }),

    updateHoliday: withAuthorization('updateHoliday', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return holidayService.updateHoliday(input, context.user.id)
    }),

    deleteHoliday: withAuthorization('deleteHoliday', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return holidayService.deleteHoliday(input, context.user.id)
    }),

    createDepartment: withAuthorization(
        'createDepartment',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return departmentService.createDepartment(input, context.user.id)
        },
    ),

    updateDepartment: withAuthorization(
        'updateDepartment',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return departmentService.updateDepartment(input, context.user.id)
        },
    ),

    deleteDepartment: withAuthorization(
        'deleteDepartment',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return departmentService.deleteDepartment(input, context.user.id)
        },
    ),

    createPosition: withAuthorization(
        'createPosition',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return positionService.createPosition(input, context.user.id)
        },
    ),

    updatePosition: withAuthorization(
        'updatePosition',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return positionService.updatePosition(input, context.user.id)
        },
    ),

    deletePosition: withAuthorization(
        'deletePosition',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return positionService.deletePosition(input, context.user.id)
        },
    ),

    createUser: withAuthorization('createUser', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return userService.createUser(input, context.user.id)
    }),

    updateUser: withAuthorization('updateUser', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return userService.updateUser(input, context.user.id)
    }),

    deleteUser: withAuthorization('deleteUser', ROLE_ACCESS.admin, async (_, { input }, context) => {
        return userService.deleteUser(input, context.user.id)
    }),

    resetUserPassword: withAuthorization(
        'resetUserPassword',
        ROLE_ACCESS.admin,
        async (_, { input }, context) => {
            return userService.resetUserPassword(input, context.user.id)
        },
    ),
}

export default mutationResolvers
