import * as userQueries from './query/user.resolver.js'
import * as attendanceQueries from './query/attendance.resolver.js'
import * as holidayQueries from './query/holiday.resolver.js'
import * as auditLogQueries from './query/auditLog.resolver.js'
import * as jobQueries from './query/job.resolver.js'
import * as leaveRequestQueries from './query/leaveRequest.resolver.js'
import * as notificationQueries from './query/notification.resolver.js'
import * as overtimeRequestQueries from './query/overtimeRequest.resolver.js'
import * as userDeviceQueries from './query/userDevice.resolver.js'
import * as userJoinedJobQueries from './query/userJoinedJob.resolver.js'

export const resolvers = {
    Query: {
        ...userQueries,
        ...attendanceQueries,
        ...holidayQueries,
        ...auditLogQueries,
        ...jobQueries,
        ...leaveRequestQueries,
        ...notificationQueries,
        ...overtimeRequestQueries,
        ...userDeviceQueries,
        ...userJoinedJobQueries,
    },
    // Mutation: {
    // },
    // Subscription: {
    // },
}

