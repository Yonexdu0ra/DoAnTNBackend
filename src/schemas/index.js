export const typeDefs = `
scalar Date
scalar JSON
enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

enum StatusType {
  PENDING
  APPROVED
  REJECTED
  CANCELED
}

enum LeaveType {
  SICK
  VACATION
  PERSONAL
  OTHER
}

enum AttendanceType {
  PRESENT
  ABSENT
  LATE
  EARLY_LEAVE
  LATE_AND_EARLY
  MISSING_CHECKIN
  MISSING_CHECKOUT
}

enum NotificationType {
  SYSTEM
  OVERTIME
  LEAVE
  APPROVAL
  REMINDER
}

enum HolidayType {
  NATIONAL
  RELIGIOUS
  CULTURAL
  COMPANY
  OTHER
}

type Attendance {
  id: ID!
  date: String!
  type: AttendanceType
  isFraud: Boolean
  fraudReason: String
  checkInAt: Date
  checkOutAt: Date
  checkInMeta: JSON
  checkOutMeta: JSON
  userId: ID
  jobId: ID
  user: User
  job: Job
  createdAt: Date
  updatedAt: Date
}

type AuditLog {
  id: ID!
  action: String!
  userId: ID
  resourceId: ID
  resource: String
  oldValue: JSON
  newValue: JSON
  ipAddress: String
  userAgent: String
  status: String
  createdAt: Date
}

type Holiday {
  id: ID!
  name: String!
  type: HolidayType
  description: String
  startDate: String
  isPaid: Boolean
  endDate: String
  createdAt: Date
  updatedAt: Date
}

type Job {
  id: ID!
  title: String!
  description: String
  address: String
  workStartTime: Date
  workEndTime: Date
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  earlyLeaveMinutes: Int
  lateLeaveMinutes: Int
  latitude: Float
  longitude: Float
  radius: Float
  maxMembers: Int
  createdAt: Date
  updatedAt: Date
  manager: [JobManager]
}

type JobManager {
  id: ID!
  jobId: ID!
  userId: ID!
  job: Job
  user: User
  createdAt: Date
  updatedAt: Date
}

type LeaveRequest {
  id: ID!
  userId: ID
  jobId: ID
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  reason: String
  status: StatusType
  reply: String
  approverBy: ID
  approver: User
  approverAt: Date
  createdAt: Date
  updatedAt: Date
  user: User
  job: Job
}

type Notification {
  id: ID!
  userId: ID
  title: String
  content: String
  type: NotificationType
  isRead: Boolean
  refType: String
  refId: ID
  createdAt: Date
  readAt: Date
}

type OvertimeRequest {
  id: ID!
  userId: ID
  jobId: ID
  date: Date
  startTime: Date
  endTime: Date
  minutes: Int
  reason: String
  status: StatusType
  reply: String
  approverBy: ID
  approver: User
  approverAt: Date
  createdAt: Date
  updatedAt: Date
  user: User
  job: Job
}
type Profile {
  id: ID!
  userId: ID
  fullName: String
  address: String
  avatarUrl: String
  bio: String
  createdAt: Date
  updatedAt: Date
}
type User {
    id: ID!
    email: String
    code: String
    phone: String
    role: Role
    biometricEnabled: Boolean
    createdAt: Date
    updatedAt: Date
    profile: Profile
}

type UserDevice {
  id: ID!
  userId: ID
  deviceId: String
  platform: String
  deviceName: String
  ipAddress: String
  createdAt: Date
  updatedAt: Date
  user: User
}

type UserJoinedJob {
  id: ID!
  userId: ID
  jobId: ID
  status: StatusType
  createdAt: Date
  updatedAt: Date
  user: User
  job: Job
}

input PaginationPageInput {
  page: Int
  limit: Int
}

input PaginationCursorInput {
  cursor: ID
  limit: Int
}
enum SortDirection {
  asc
  desc
}
input orderByInput {
  field: String
  direction: SortDirection
}

input searchInput {
  field: String
  value: String
}

input filterInput {
    field: String
    operator: String
    value: String
}

type UserPaginationPageResult {
    data: [User]
    total: Int
}
type JobPaginationPageResult {
    data: [Job]
    total: Int
}

type auditPaginationPageResult {
    data: [AuditLog]
    total: Int
}

type StatisticsByAdmin {
    "Thông số tổng tất cả các bảng từ trước tới giờ để hiển thị trên dashboard admin"
    totalUsers: Int
    totalJobs: Int
    totalAttendances: Int
    totalLeaveRequests: Int
    totalOvertimeRequests: Int
    totalManagers: Int
    totalEmployees: Int
    totalFraudAttendances: Int
    totalHolidays: Int
    "Thông số thống kê theo tháng để hiển thị trên dashboard admin"
    totalUsersByMonth: Int
    totalJobsByMonth: Int
    totalAttendancesByMonth: Int
    totalLeaveRequestsByMonth: Int
    totalOvertimeRequestsByMonth: Int
    totalFraudAttendancesByMonth: Int
    totalHolidaysByMonth: Int
    "Thông số thống kê theo ngày để hiển thị trên dashboard admin"
    totalUsersByDay: Int
    totalJobsByDay: Int
    totalAttendancesByDay: Int
    totalLeaveRequestsByDay: Int
    totalOvertimeRequestsByDay: Int
    totalFraudAttendancesByDay: Int
    totalHolidaysByDay: Int
}
type StatisticsByManager {
    "Thông số tổng tất cả các bảng liên quan đến công việc của manager đang quản lý để hiển thị trên dashboard manager"
    totalUsersByJob: Int
    totalAttendancesByJob: Int
    totalLeaveRequestsByJob: Int
    totalOvertimeRequestsByJob: Int
    totalFraudAttendancesByJob: Int
    "Thông số thống kê theo tháng để hiển thị trên dashboard manager"
    totalUsersByJobByMonth: Int
    totalAttendancesByJobByMonth: Int
    totalLeaveRequestsByJobByMonth: Int
    totalOvertimeRequestsByJobByMonth: Int
    totalFraudAttendancesByJobByMonth: Int
    "Thông số thống kê theo ngày để hiển thị trên dashboard manager"
    totalUsersByJobByDay: Int
    totalAttendancesByJobByDay: Int
    totalLeaveRequestsByJobByDay: Int
    totalOvertimeRequestsByJobByDay: Int
    totalFraudAttendancesByJobByDay: Int

}
type StatisticsByEmployee {
    "Thông số tổng tất cả các bảng liên quan đến công việc của employee đang tham gia để hiển thị trên dashboard employee"
    totalAttendancesByMonth: Int
    totalLeaveRequestsByMonth: Int
    totalOvertimeRequestsByMonth: Int
    totalFraudAttendancesByMonth: Int
    totalHoursWorkedByMonth: Int
    totalHoursWorked: Int
    totalHolidaysByMonth: Int

}

type UserByJobPaginationPageResult {
    data: [User]
    total: Int
}
type LeaveRequestPaginationPageResult {
    data: [LeaveRequest]
    total: Int
}
type OvertimeRequestPaginationPageResult {
    data: [OvertimeRequest]
    total: Int
}


type LeaveRequestPaginationCursorResult {
    data: [LeaveRequest]
    nextCursor: ID
}

type OvertimeRequestPaginationCursorResult {
    data: [OvertimeRequest]
    nextCursor: ID
}

type AttendancePaginationCursorResult {
    data: [Attendance]
    nextCursor: ID
}


type Query {
    # các query chung cho tất cả các role
    "Danh sách ngày nghỉ trong khoảng thời gian để hiển thị trên calendar"
    holidays(startDate: String, endDate: String): [Holiday]
    me: User

    # các query chung cho manager và admin
    "Tìm kiếm user theo email hoặc code cho manager và admin"
    searchEmployee(search: searchInput): [User]

    # các query riêng của admin
    "Tìm kiếm quản lý theo email hoặc code cho admin"
    searchManager(search: searchInput): [User]
    "Phân trang và sắp xếp, tim kiếm người dùng cho admin"
    users(pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): UserPaginationPageResult
    "Phân trang và sắp xếp, tim kiếm công việc cho admin"
    jobs(pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): JobPaginationPageResult
    "Phân trang và sắp xếp, tim kiếm đơn audit cho admin"
    auditLogs(pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): auditPaginationPageResult
    "Thông kê dữ liệu cho dashboard admin"
    statisticsByAdmin: StatisticsByAdmin

    # các query riêng của manager
    "Dánh sách công việc của manager đang quản lý"
    jobsByManager(pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): JobPaginationPageResult
    "Danh sách nhân viên trong công việc của manager"
    usersByJob(jobId: ID!, pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): UserByJobPaginationPageResult
    "Danh sach đơn xin nghỉ của nhân viên trong công việc của manager"
    leaveRequestsByJob(jobId: ID!, pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): LeaveRequestPaginationPageResult
    "Danh sach đơn xin làm thêm của nhân viên trong công việc của manager"
    overtimeRequestsByJob(jobId: ID!, pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): OvertimeRequestPaginationPageResult
    "Danh sách các bản ghi chấm công trong công việc của manager quản lý"
    attendancesByJob(jobId: ID!, pagination: PaginationPageInput = { page: 1, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): [Attendance]

    statisticsByManager: StatisticsByManager

    # các query riêng của employee
    "Danh sách các bản ghi chấm công trong khoảng thời gian"
    attendancesByEmployeeByTime(startDate: String, endDate: String): [Attendance]
    "Danh sách chấm công của employee trong công"
    attendancesByEmployees(pagination: PaginationCursorInput = { cursor: null, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): AttendancePaginationCursorResult
    "Danh sách đơn xin nghỉ của employee "
    leaveRequestsByEmployee(pagination: PaginationCursorInput = { cursor: null, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): LeaveRequestPaginationCursorResult
    "Danh sách đơn xin làm thêm của employee "
    overtimeRequestsByEmployee(pagination: PaginationCursorInput = { cursor: null, limit: 10 }, orderBy: orderByInput = { field: "createdAt", direction: desc }, search: searchInput): OvertimeRequestPaginationCursorResult

}

input UpdateProfileInput {
  fullName: String
  address: String
  avatarUrl: String
  bio: String
}

input CreateJobInput {
  title: String!
  description: String
  address: String!
  workStartTime: Date!
  workEndTime: Date!
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  earlyLeaveMinutes: Int
  lateLeaveMinutes: Int
  latitude: Float!
  longitude: Float!
  radius: Float!
  maxMembers: Int!
  managerIds: [ID!]
}

type ResponseUpdateProfile {
  success: Boolean!
  message: String!
  data: Profile
}

type ResponseCreateJob {
  success: Boolean!
  message: String!
  data: Job
}

input CreateHolidayInput {
  name: String!
  type: HolidayType
  description: String
  startDate: String!
  endDate: String!
  isPaid: Boolean
}

type ResponseCreateHoliday {
  success: Boolean!
  message: String!
  data: Holiday
}

input createProfileInput {
  fullName: String
  address: String
  avatarUrl: String
  bio: String
}

input CreateUserInput {
  email: String!
  phone: String!
  role: Role
  profile: createProfileInput
}

type ResponseCreateUser {
  success: Boolean!
  message: String!
  data: User
}

type ResponseCreateOvertimeRequest {
  success: Boolean!
  message: String!
  data: OvertimeRequest
}
type ResponseCreateAttendance {
  success: Boolean!
  message: String!
  data: Attendance
}
type ResponseCreateLeaveRequest {
  success: Boolean!
  message: String!
  data: LeaveRequest
}
input ReviewLeaveRequestInput {
  id: ID!
  status: StatusType!
  reply: String
}
input ReviewOvertimeRequestInput {
  id: ID!
  status: StatusType!
  reply: String
}
input ManageEmployeeInJobInput {
  jobId: ID!
  employeeIds: [ID!]
}
input ReviewFraudAttendanceInput {
  id: ID!
  isFraud: Boolean!
  fraudReason: String
}
input CreateManualAttendanceInput {
  jobId: ID!
  userId: ID!
  date: String!
  type: AttendanceType!
}
input CreateManualLeaveRequestInput {
  jobId: ID!
  userId: ID!
  leaveType: LeaveType!
  startDate: Date!
  endDate: Date!
  reason: String!
}
input CreateManualOvertimeRequestInput {
  jobId: ID!
  userId: ID!
  date: Date!
  startTime: Date!
  endTime: Date!
  reason: String!
}
input CreateEmployeeLeaveRequestInput {
  leaveType: LeaveType!
  startDate: Date!
  endDate: Date!
  reason: String!
}
input CreateEmployeeOvertimeRequestInput {
  date: Date!
  startTime: Date!
  endTime: Date!
  reason: String!
}
input CreateAttendanceInput {
  jobId: ID!
  deviceId: String!
  platform: String!
  deviceName: String
  ipAddress: String!
  "Mã qr code được mã hóa từ client"
  code: String!
  latitude: Float!
  longitude: Float!
  "Kiểu chấm công: vào hoặc ra"
  type: String!
}
type Mutation {
  # các mutation chung cho tất cả các role
  "Cập nhật thông tin cá nhân cho user"
  updateProfile(input: UpdateProfileInput): ResponseUpdateProfile

  # các mutation riêng của admin
  "Tạo công việc mới cho admin"
  createJob(input: CreateJobInput): ResponseCreateJob
  "Cập nhật công việc cho admin"
  updateJob(id: ID!, input: CreateJobInput): ResponseCreateJob
  "Xóa công việc cho admin"
  deleteJob(id: ID!): ResponseCreateJob

  "Tạo mới một ngày nghỉ cho admin"
  createHoliday(input: CreateHolidayInput): ResponseCreateHoliday
  "Cập nhật một ngày nghỉ cho admin"
  updateHoliday(id: ID!, input: CreateHolidayInput): ResponseCreateHoliday
  "Xóa một ngày nghỉ cho admin"
  deleteHoliday(id: ID!): ResponseCreateHoliday

  "Tạo mới một user cho admin"
  createUser(input: CreateUserInput): ResponseCreateUser
  "Cập nhật một user cho admin"
  updateUser(id: ID!, input: CreateUserInput): ResponseCreateUser
  "Reset lại mật khẩu cho user"
  resetPassword(id: ID!): ResponseCreateUser
  "Khóa hoặc mở khóa tài khoản user"
  toggleUserStatus(id: ID!): ResponseCreateUser

  # các mutation riêng của manager
  "Phê duyệt hoặc từ chối đơn xin nghỉ của nhân viên trong công việc của manager"
  reviewLeaveRequest(input: ReviewLeaveRequestInput): ResponseCreateLeaveRequest
  "Phê duyệt hoặc từ chối đơn xin làm thêm của nhân viên trong công việc của manager"
  reviewOvertimeRequest(input: ReviewOvertimeRequestInput): ResponseCreateOvertimeRequest
  "Thêm hoặc xóa nhân viên khỏi công việc của manager"
  manageEmployeeInJob(input: ManageEmployeeInJobInput): ResponseCreateJob
  "Phê duyệt hoặc từ chối bản ghi chấm công bị nghi ngờ gian lận của nhân viên trong công việc của manager"
  reviewFraudAttendance(input: ReviewFraudAttendanceInput): ResponseCreateAttendance
  "Tạo bản ghi chấm công thủ công cho nhân viên trong công việc của manager"
  createManualAttendance(input: CreateManualAttendanceInput): ResponseCreateAttendance
  "Tạo bản ghi xin nghỉ cho nhân viên trong công việc của manager"
  createManualLeaveRequest(input: CreateManualLeaveRequestInput): ResponseCreateLeaveRequest
  "Tạo bản ghi xin làm thêm cho nhân viên trong công việc của manager"
  createManualOvertimeRequest(input: CreateManualOvertimeRequestInput): ResponseCreateOvertimeRequest

  # các mutation riêng của employee
  "Tạo đơn xin nghỉ cho employee"
  createLeaveRequest(jobId: ID!, input: CreateEmployeeLeaveRequestInput!): ResponseCreateLeaveRequest
  "Tạo đơn xin làm thêm cho employee"
  createOvertimeRequest(jobId: ID!, input: CreateEmployeeOvertimeRequestInput!): ResponseCreateOvertimeRequest
  "Chấm công vào hoặc ra cho employee"
  createAttendance(input: CreateAttendanceInput!): ResponseCreateAttendance

}

type Subscription {
  # các subscription chung cho tất cả các role
  "Nhận thông báo khi có sự kiện liên quan đến user như được thêm vào công việc, đơn xin nghỉ được phê duyệt, v.v."
  notificationReviced: Notification
  # các subscription riêng của manager
  "Nhận thông báo khi có đơn xin nghỉ mới của nhân viên trong công việc của manager"
  newReviewLeaveRequestByJob(jobId: ID!): LeaveRequest
  "Nhận thông báo khi có đơn xin làm thêm mới của nhân viên trong công việc của manager"
  newReviewOvertimeRequestByJob(jobId: ID!): OvertimeRequest
  "nhận thông báo khi có bản ghi chấm công mới của nhân viên trong công việc của manager"
  newReviewAttendanceByJob(jobId: ID!): Attendance
  "Nhận thông báo khi được thêm hoặc xóa nhân viên khỏi công việc của manager"
  employeeManageredInJobUpdated(jobId: ID!): User
  "Nhận thông báo khi được thêm vào ca quản lý hoặc xóa hỏi ca quản lý của manager"
  jobManagerUpdated: Job
  # các subscription riêng của employee
  "Nhận thông báo khi có đơn xin nghỉ mới của employee được phê duyệt hoặc từ chối"
  leaveRequestUpdated(jobId: ID!): LeaveRequest
  "Nhận thông báo khi có đơn xin làm thêm mới của employee được phê duyệt hoặc từ chối"
  overtimeRequestUpdated(jobId: ID!): OvertimeRequest
  "nhận thông báo khi có bản ghi chấm công mới của employee được phê duyệt hoặc từ chối"
  attendanceUpdated(userId: ID!, jobId: ID!): Attendance  

  
}


`