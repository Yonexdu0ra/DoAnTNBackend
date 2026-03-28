import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import jobService from '../../services/job.service.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import attendanceService from '../../services/attendance.service.js'
import statisticsService from '../../services/statistics.service.js'

const managerQueries = {
    jobsByManager: withAuthorization('jobsByManager', ROLE_ACCESS.manager, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return jobService.getJobsByManager(context.user.id, args.pagination, args.orderBy, args.search, select)
    }),

    usersByJob: withAuthorization('usersByJob', ROLE_ACCESS.manager, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return jobService.getUsersByJob(context.user.id, args.jobId, args.pagination, args.orderBy, args.search, select)
    }),

    leaveRequestsByJob: withAuthorization('leaveRequestsByJob', ROLE_ACCESS.manager, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return leaveRequestService.getLeaveRequestsByJob(context.user.id, args.jobId, args.pagination, args.orderBy, args.search, select)
    }),

    overtimeRequestsByJob: withAuthorization('overtimeRequestsByJob', ROLE_ACCESS.manager, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return overtimeRequestService.getOvertimeRequestsByJob(context.user.id, args.jobId, args.pagination, args.orderBy, args.search, select)
    }),

    attendancesByJob: withAuthorization('attendancesByJob', ROLE_ACCESS.manager, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return attendanceService.getAttendancesByJob(context.user.id, args.jobId, args.pagination, args.orderBy, args.search, select)
    }),

    statisticsByManager: withAuthorization('statisticsByManager', ROLE_ACCESS.manager, async (_parent, _args, context) => {
        return statisticsService.getStatisticsByManager(context.user.id)
    }),
}

export default managerQueries
