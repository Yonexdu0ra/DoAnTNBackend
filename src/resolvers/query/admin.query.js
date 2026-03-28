import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import userService from '../../services/user.service.js'
import jobService from '../../services/job.service.js'
import auditLogService from '../../services/auditLog.service.js'
import statisticsService from '../../services/statistics.service.js'

const adminQueries = {
    searchManager: withAuthorization('searchManager', ROLE_ACCESS.admin, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return userService.searchManager(args.search, select)
    }),

    users: withAuthorization('users', ROLE_ACCESS.admin, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return userService.getUsers(args.pagination, args.orderBy, args.search, select)
    }),

    jobs: withAuthorization('jobs', ROLE_ACCESS.admin, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return jobService.getJobs(args.pagination, args.orderBy, args.search, select)
    }),

    auditLogs: withAuthorization('auditLogs', ROLE_ACCESS.admin, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return auditLogService.getAuditLogs(args.pagination, args.orderBy, args.search, select)
    }),

    statisticsByAdmin: withAuthorization('statisticsByAdmin', ROLE_ACCESS.admin, async () => {
        return statisticsService.getStatisticsByAdmin()
    }),
}

export default adminQueries
