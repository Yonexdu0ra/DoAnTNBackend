

import { attendanceType } from './attendance.type.js'
import { holidayType } from './holiday.type.js'
import { jobType } from './job.type.js'
import { profileType } from './profile.type.js'
import { userJoinedJobType } from './userJoinedJob.js'
import { userType } from './user.type.js'
import { overtimeRequestType } from './overtimeRequest.type.js'
import { auditLogType } from './auditLog.type.js'
import { leaveRequestType } from './leaveRequest.type.js'
import { userDeviceType } from './userDevice.type.js'
import { notificationType } from './notification.type.js'

const enumTypes = `
scalar Date
scalar JSON

`;

const typeQuery = `
type Query {
  holidays: [Holiday]
}
`

export const typeDefs = [
  enumTypes,
  // userType,
  // profileType,
  // jobType,
  // attendanceType,
  // leaveRequestType,
  // userJoinedJobType,
  // overtimeRequestType,
  // auditLogType,
  // userDeviceType,
  // notificationType,
  holidayType,
  typeQuery,
]