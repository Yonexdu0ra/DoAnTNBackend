

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
enum SortOrder {
  asc
  desc
}
input OrderBy {
  field: String!
  order: SortOrder!
}
input PaginationPageInput {
  page: Int!
  limit: Int!
}
input PaginationCursorInput {
  cursor: String!
  limit: Int!
}

type UserPage {
  data: [User!]!
  total: Int!
  page: Int!
}

type UserCursorPage {
  data: [User!]!
  total: Int!
  cursor: String!
}

input FilterInput {
  keyword: String
}
input UserFilterInput {
  role: String
  email: String
  createdAt: Date
}

type AttendancePage{
  data: [Attendance!]!
  total: Int!
  page: Int!
}

type AuditLogPage {
  data: [AuditLog!]!
  total: Int!
  page: Int!
}


type JobPage {
  data: [Job!]!
  total: Int!
  page: Int!
}
`;

const typeQuery = `
type Query {
  # admin
  users(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): UserPage!
  usersCursor(pagination: PaginationCursorInput, orderBy: OrderBy): UserCursorPage!
  
  # chung nhưng chỉ user mới có thể xem được thông tin của chính mình nếu không có quyền admin|manager
  user(id: ID!): User

  holiday(id: ID!): Holiday
  holidays(startDate: Date!, endDate: Date!): [Holiday!]!

  # admin
  attendances(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  attendancesCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  attendancesByJob(jobId: ID!, pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  
  # admin|manager 
  attendancesCursorByJob(jobId: ID!, pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  
  # chung
  attendance(id: ID!): Attendance
  
  # user
  attendancesByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  attendancesCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): AttendancePage!
  
  #admin
  auditLogs(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): AuditLogPage!
  auditLogsCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): AuditLogPage!
  auditLog(id: ID!): AuditLog

  #admin|manager
  jobs(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): JobPage!
  jobsCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): JobPage!
  #user
  jobsByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): JobPage!
  jobsCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): JobPage!
  # chung 
  job(id: ID!): Job

  # admin|manager
  leaveRequests(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [LeaveRequest!]!
  leaveRequestCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [LeaveRequest!]!

  # user
  leaveRequestsByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [LeaveRequest!]!

  leaveRequestCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [LeaveRequest!]!

  # chung
  leaveRequest(id: ID!): LeaveRequest

  # admin|manager
  notifications(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [Notification!]!
  notificationCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [Notification!]!

  # user
  notificationsByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [Notification!]!
  notificationCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [Notification!]!
  # chung
  notification(id: ID!): Notification

  # admin|manager
  overtimeRequests(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [OvertimeRequest!]!
  overtimeRequestCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [OvertimeRequest!]!

  # user
  overtimeRequestsByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [OvertimeRequest!]!
  overtimeRequestCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [OvertimeRequest!]!

  # chung
  overtimeRequest(id: ID!): OvertimeRequest

  #admin|manager
  userDevices(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [UserDevice!]!
  userDeviceCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [UserDevice!]!

  # user
  userDevicesByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [UserDevice!]!
  userDeviceCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [UserDevice!]!

  # chung
  userDevice(id: ID!): UserDevice

  # admin|manager
  userJoinedJobs(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [UserJoinedJob!]!
  userJoinedJobCursor(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [UserJoinedJob!]!

  # user
  userJoinedJobsByUser(pagination: PaginationPageInput, filter: FilterInput, orderBy: OrderBy): [UserJoinedJob!]!
  userJoinedJobCursorByUser(pagination: PaginationCursorInput, filter: FilterInput, orderBy: OrderBy): [UserJoinedJob!]!

  # chung
  userJoinedJob(id: ID!): UserJoinedJob

}
`

export const typeDefs = [
  enumTypes,
  profileType,
  userType,
  jobType,
  attendanceType,
  leaveRequestType,
  userJoinedJobType,
  overtimeRequestType,
  auditLogType,
  userDeviceType,
  notificationType,
  holidayType,
  typeQuery,
]