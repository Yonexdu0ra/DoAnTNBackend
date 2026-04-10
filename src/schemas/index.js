// Template tag chỉ dùng cho syntax highlighting, trả về string thuần
const gql = (strings, ...values) =>
    strings.reduce((result, str, i) => result + str + (values[i] || ''), '');


const scalarTypes = gql`
scalar Date
scalar JSON
`

const enumTypes = gql`
enum SortOrder {
  ASC
  DESC
}

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

enum GenderType {
    MALE
    FEMALE
}


enum StatusType {
  PENDING
  APPROVED
  REJECTED
  CANCELED
}

enum LeaveType {
  #    Nghỉ phép năm (phép tích lũy)
  ANNUAL

  #    Nghỉ ốm (có giấy xác nhận y tế)
  SICK

  #    Nghỉ thai sản
  MATERNITY

  #    Nghỉ việc riêng có lương (cưới, tang,...)
  PERSONAL_PAID

  #    Nghỉ việc riêng không lương
  PERSONAL_UNPAID

  #    Nghỉ không lương (xin riêng)
  UNPAID

  #    Nghỉ lễ, Tết (theo nhà nước)
  PUBLIC_HOLIDAY

  #    Nghỉ bù (do làm thêm)
  COMPENSATORY

  #    Đi công tác (business trip)
  BUSINESS_TRIP

  #    Làm việc từ xa (WFH nhưng tính như leave trong 1 số hệ thống)
  WORK_FROM_HOME

  #    Khác (fallback)
  OTHER
}

enum AttendanceType {
  #   Đi làm đầy đủ, đúng giờ
  PRESENT

  #   Vắng mặt không lý do
  ABSENT

  #   Đi muộn
  LATE

  #   Về sớm
  EARLY_LEAVE

  #   Vừa đi muộn vừa về sớm
  LATE_AND_EARLY

  #   Thiếu check-in (không chấm công đầu giờ)
  MISSING_CHECKIN

  #   Thiếu check-out (không chấm công cuối giờ)
  MISSING_CHECKOUT

  #   Nghỉ có phép (đã được duyệt)
  ON_LEAVE

  #   Nghỉ lễ / ngày nghỉ công ty
  HOLIDAY

  #   Làm thêm giờ (ngoài giờ hành chính)
  OVERTIME

  #   Làm việc từ xa (WFH)
  WORK_FROM_HOME

  #   Đi công tác
  BUSINESS_TRIP

  #   Check-in nhưng không đủ giờ làm (ví dụ < 50% ngày công)
  HALF_DAY

  #   Có mặt nhưng đang trong trạng thái nghỉ ốm / thai sản (mapping với leave)
  ON_LEAVE_PAID

  #   Ca làm bị lỗi dữ liệu / chưa xác định (fallback)
  UNKNOWN
}

enum NotificationType {
  SYSTEM
  OVERTIME
  LEAVE
  APPROVAL
  REMINDER
}

enum HolidayType {
  # Nghỉ phép năm (Annual Leave)
  # Có lương (công ty trả)
  ANNUAL_LEAVE

  # Nghỉ lễ, Tết (Public Holiday)
  # Có lương 100% (công ty trả)
  PUBLIC_HOLIDAY

  # Nghỉ ốm (Sick Leave)
  # Có lương (BHXH chi trả, không phải công ty)
  SICK_LEAVE

  # Nghỉ thai sản (Maternity Leave)
  # Có lương (BHXH chi trả)
  MATERNITY_LEAVE

  # Nghỉ việc riêng có lương (Paid Personal Leave)
  # Có lương (theo luật)
  PAID_PERSONAL_LEAVE

  # Nghỉ không lương (Unpaid Leave)
  # Không có lương
  UNPAID_LEAVE

  # Nghỉ bù (Compensatory Leave)
  # Có lương (hoặc đã được trả OT)
  COMPENSATORY_LEAVE

  # Nghỉ theo chính sách công ty (Company Leave)
  # Thường có lương (tuỳ công ty)
  COMPANY_LEAVE
}

enum StatisticsTrendType {
  DAY
  WEEK
  MONTH
  YEAR
}
`
const defineType = gql`
# Vị trí công việc
type Positon {
    id: ID
    name: String
    description: String
    department: Department
    createdAt: Date
    updatedAt: Date
}

  # giữ đúng chính tả để dùng cho query mới
  type Position {
    id: ID
    name: String
    description: String
    department: Department
    createdAt: Date
    updatedAt: Date
  }

type Department {
    id: ID
    name: String
    description: String
    createdAt: Date
    updatedAt: Date
}

# Thông tin chi tiết của người dùng
type Profile {
    id: ID
    fullName: String
    gender: GenderType
    address: String
    birthday: Date
    avatarUrl: String
    bio: String
}
# Thông tin cơ bản của người dùng
type User {
    id: ID
    email: String
    phone: String
    code: String
    biometricEnabled: Boolean
    role: Role
    profile: Profile
    department: Department
    position: Position
    departmentId: ID
    positionId: ID
    deleteAt: Date
    createdAt: Date
    updatedAt: Date
}
# Bảng chấm công (điểm danh) của nhân viên
type Attendance {
  id: ID!
  date: Date!
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
# Nhật ký hoạt động của người dùng (để theo dõi các hành động quan trọng như đăng nhập, thay đổi thông tin, v.v.)
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
# Ngày nghỉ lễ (để tính toán ngày làm việc và ngày nghỉ)
type Holiday {
  id: ID!
  name: String!
  type: HolidayType
  description: String
  startDate: Date
  isPaid: Boolean
  endDate: Date
  createdAt: Date
  updatedAt: Date
}
# Công việc (để quản lý các công việc, dự án, hoặc ca làm việc mà nhân viên tham gia)
type Job {
  id: ID!
  title: String!
  description: String
  address: String
  workStartTime: Date
  workEndTime: Date
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  earlyCheckOutMinutes: Int
  lateCheckOutMinutes: Int
  latitude: Float
  longitude: Float
  radius: Float
  maxMembers: Int
  createdAt: Date
  updatedAt: Date
  manager: [JobManager]
}
# Bảng liên kết giữa công việc và người quản lý (để hỗ trợ nhiều quản lý cho một công việc)
type JobManager {
  id: ID!
  jobId: ID!
  userId: ID!
  job: Job
  user: User
  createdAt: Date
  updatedAt: Date
}
# Yêu cầu nghỉ phép
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
  approvedBy: ID
  approver: User
  approverAt: Date
  createdAt: Date
  updatedAt: Date
  user: User
  job: Job
}
# Thông báo cho người dùng (ví dụ: thông báo phê duyệt, nhắc nhở, v.v.)
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
# Yêu cầu làm thêm giờ
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
  approvedBy: ID
  approver: User
  approverAt: Date
  createdAt: Date
  updatedAt: Date
  user: User
  job: Job
}
# Thông tin thiết bị của người dùng (để quản lý đăng nhập và bảo mật)
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
# Bảng liên kết giữa người dùng và công việc (để quản lý trạng thái tham gia)
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

# output response dùng chung
type BaseResponse {
  status: String!
  code: Int!
  message: String!
}

type PageInfo {
  page: Int!
  limit: Int!
  total: Int!
  totalPages: Int!
  hasNextPage: Boolean!
  hasPrevPage: Boolean!
}

type CursorPageInfo {
  limit: Int!
  nextCursor: String
  hasNextPage: Boolean!
}

# response theo từng type
type PositonResponse {
  status: String!
  code: Int!
  message: String!
  data: Positon
}

type PositonListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Positon!]!
  pagination: PageInfo
}

type PositionResponse {
  status: String!
  code: Int!
  message: String!
  data: Position
}

type PositionListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Position!]!
  pagination: PageInfo
}

type DepartmentResponse {
  status: String!
  code: Int!
  message: String!
  data: Department
}

type DepartmentListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Department!]!
  pagination: PageInfo
}

type ProfileResponse {
  status: String!
  code: Int!
  message: String!
  data: Profile
}

type ProfileListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Profile!]!
  pagination: PageInfo
}

type UserResponse {
  status: String!
  code: Int!
  message: String!
  data: User
}

type UserListResponse {
  status: String!
  code: Int!
  message: String!
  data: [User!]!
  pagination: PageInfo
}

type AttendanceResponse {
  status: String!
  code: Int!
  message: String!
  data: Attendance
}

type AttendanceListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Attendance!]!
  pagination: PageInfo
}

type AttendanceCursorListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Attendance!]!
  pagination: CursorPageInfo
}

type AuditLogResponse {
  status: String!
  code: Int!
  message: String!
  data: AuditLog
}

type AuditLogListResponse {
  status: String!
  code: Int!
  message: String!
  data: [AuditLog!]!
  pagination: PageInfo
}

type HolidayResponse {
  status: String!
  code: Int!
  message: String!
  data: Holiday
}

type HolidayListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Holiday!]!
  pagination: PageInfo
}

type JobResponse {
  status: String!
  code: Int!
  message: String!
  data: Job
}

type JobListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Job!]!
  pagination: PageInfo
}

type JobManagerResponse {
  status: String!
  code: Int!
  message: String!
  data: JobManager
}

type JobManagerListResponse {
  status: String!
  code: Int!
  message: String!
  data: [JobManager!]!
  pagination: PageInfo
}

type LeaveRequestResponse {
  status: String!
  code: Int!
  message: String!
  data: LeaveRequest
}

type LeaveRequestListResponse {
  status: String!
  code: Int!
  message: String!
  data: [LeaveRequest!]!
  pagination: PageInfo
}

type LeaveRequestCursorListResponse {
  status: String!
  code: Int!
  message: String!
  data: [LeaveRequest!]!
  pagination: CursorPageInfo
}

type NotificationResponse {
  status: String!
  code: Int!
  message: String!
  data: Notification
}

type NotificationListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Notification!]!
  pagination: PageInfo
}

type NotificationCursorListResponse {
  status: String!
  code: Int!
  message: String!
  data: [Notification!]!
  pagination: CursorPageInfo
}

type OvertimeRequestResponse {
  status: String!
  code: Int!
  message: String!
  data: OvertimeRequest
}

type OvertimeRequestListResponse {
  status: String!
  code: Int!
  message: String!
  data: [OvertimeRequest!]!
  pagination: PageInfo
}

type OvertimeRequestCursorListResponse {
  status: String!
  code: Int!
  message: String!
  data: [OvertimeRequest!]!
  pagination: CursorPageInfo
}

type UserDeviceResponse {
  status: String!
  code: Int!
  message: String!
  data: UserDevice
}

type UserDeviceListResponse {
  status: String!
  code: Int!
  message: String!
  data: [UserDevice!]!
  pagination: PageInfo
}

type UserJoinedJobResponse {
  status: String!
  code: Int!
  message: String!
  data: UserJoinedJob
}

type UserJoinedJobListResponse {
  status: String!
  code: Int!
  message: String!
  data: [UserJoinedJob!]!
  pagination: PageInfo
}

# shared dashboard blocks
type DashboardAlert {
  id: ID
  type: String!
  title: String!
  description: String
  severity: String
  dueAt: Date
  isRead: Boolean
}

type DashboardChartPoint {
  time: String!
  value: Float!
  label: String
}

type DashboardDistributionItem {
  label: String!
  value: Float!
  percentage: Float!
}

type DashboardActivity {
  id: ID
  type: String!
  title: String!
  description: String
  status: String
  createdAt: Date
  relatedId: ID
}

type DashboardQuickAction {
  key: String!
  label: String!
  enabled: Boolean!
  route: String
}

# Admin / HR Manager dashboard
type AdminSummaryStatistics {
  totalEmployees: Int!
  activeEmployees: Int!
  leavesAbsences: Int!
  openJobs: Int!
}

type AdminAttendanceStatistics {
  todayCheckIns: Int!
  todayCheckOuts: Int!
  onTimeRate: Float!
  lateRate: Float!
  absentRate: Float!
}

type AdminJobOverviewStatistics {
  openJobs: Int!
  assignedEmployees: Int!
  unassignedEmployees: Int!
}

type AdminChartsStatistics {
  workforceGrowth: [DashboardChartPoint!]!
  leaveTrend: [DashboardChartPoint!]!
  departmentDistribution: [DashboardDistributionItem!]!
}

type AdminDashboardStatisticsData {
  summary: AdminSummaryStatistics!
  attendanceStats: AdminAttendanceStatistics!
  jobOverview: AdminJobOverviewStatistics!
  alerts: [DashboardAlert!]!
  charts: AdminChartsStatistics!
  recentActivities: [DashboardActivity!]!
  quickActions: [DashboardQuickAction!]!
}

type AdminDashboardStatisticsResponse {
  status: String!
  code: Int!
  message: String!
  data: AdminDashboardStatisticsData
}

# Manager dashboard
type ManagerTeamKpiStatistics {
  totalTeamEmployees: Int!
  todayAttendance: Int!
  teamLeaves: Int!
}

type ManagerJobTaskStatusStatistics {
  totalTeamJobs: Int!
  averageProgress: Float!
  unassignedEmployees: Int!
}

type ManagerChartsStatistics {
  attendanceTrend: [DashboardChartPoint!]!
  taskDistribution: [DashboardDistributionItem!]!
}

type ManagerDashboardStatisticsData {
  teamKpi: ManagerTeamKpiStatistics!
  jobTaskStatus: ManagerJobTaskStatusStatistics!
  alerts: [DashboardAlert!]!
  charts: ManagerChartsStatistics!
  recentActivities: [DashboardActivity!]!
  quickActions: [DashboardQuickAction!]!
}

type ManagerDashboardStatisticsResponse {
  status: String!
  code: Int!
  message: String!
  data: ManagerDashboardStatisticsData
}

# Employee dashboard
type EmployeePersonalSummaryStatistics {
  todayAttendanceStatus: String
  remainingLeaveDays: Float!
  activeJobs: Int!
}

type EmployeeChartsStatistics {
  attendanceTrend: [DashboardChartPoint!]!
  leaveTrend: [DashboardChartPoint!]!
}

type EmployeeDashboardStatisticsData {
  personalSummary: EmployeePersonalSummaryStatistics!
  alerts: [DashboardAlert!]!
  charts: EmployeeChartsStatistics!
  recentActivities: [DashboardActivity!]!
  quickActions: [DashboardQuickAction!]!
}

type EmployeeDashboardStatisticsResponse {
  status: String!
  code: Int!
  message: String!
  data: EmployeeDashboardStatisticsData
}

type QRCodeResponse {
  status: String!
  code: Int!
  expireAt: Date!
  timeBase: Date!
  qrCodeData: String!
  type: String!
}
`

const inputType = gql`
# dùng chung cho phân trang kiểu offset-based 
input PagePaginationInput {
    page: Int
    limit: Int
}
# phân trang kiểu cursor-based (nếu cần thiết cho các truy vấn lớn)
input CursorPaginationInput {
    cursor: String
    limit: Int
}

# dùng chung cho sort
input SortOrderInput {
  field: String!
  order: SortOrder = DESC
}

# primitive filters
input StringFilterInput {
  eq: String
  contains: String
  startsWith: String
  endsWith: String
  in: [String!]
  notIn: [String!]
}

input IDFilterInput {
  eq: ID
  in: [ID!]
  notIn: [ID!]
}

input IntFilterInput {
  eq: Int
  gt: Int
  gte: Int
  lt: Int
  lte: Int
  in: [Int!]
  notIn: [Int!]
}

input FloatFilterInput {
  eq: Float
  gt: Float
  gte: Float
  lt: Float
  lte: Float
  in: [Float!]
  notIn: [Float!]
}

input BooleanFilterInput {
  eq: Boolean
}

input DateFilterInput {
  eq: Date
  gt: Date
  gte: Date
  lt: Date
  lte: Date
  between: [Date!]
}

# filters theo từng type
input PositonFilterInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  departmentId: IDFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input PositionFilterInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  departmentId: IDFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input DepartmentFilterInput {
  id: IDFilterInput
  name: StringFilterInput
  description: StringFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input ProfileFilterInput {
  id: IDFilterInput
  fullName: StringFilterInput
  genderIn: [GenderType!]
  address: StringFilterInput
  birthday: DateFilterInput
  avatarUrl: StringFilterInput
  bio: StringFilterInput
  keyword: String
}

input UserFilterInput {
  id: IDFilterInput
  email: StringFilterInput
  phone: StringFilterInput
  code: StringFilterInput
  biometricEnabled: BooleanFilterInput
  roleIn: [Role!]
  deleteAt: DateFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input AttendanceFilterInput {
  id: IDFilterInput
  date: DateFilterInput
  typeIn: [AttendanceType!]
  isFraud: BooleanFilterInput
  fraudReason: StringFilterInput
  userId: IDFilterInput
  jobId: IDFilterInput
  checkInAt: DateFilterInput
  checkOutAt: DateFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input AuditLogFilterInput {
  id: IDFilterInput
  action: StringFilterInput
  userId: IDFilterInput
  resourceId: IDFilterInput
  resource: StringFilterInput
  ipAddress: StringFilterInput
  userAgent: StringFilterInput
  status: StringFilterInput
  createdAt: DateFilterInput
  keyword: String
}

input HolidayFilterInput {
  id: IDFilterInput
  name: StringFilterInput
  typeIn: [HolidayType!]
  description: StringFilterInput
  startDate: DateFilterInput
  endDate: DateFilterInput
  isPaid: BooleanFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input JobFilterInput {
  id: IDFilterInput
  title: StringFilterInput
  description: StringFilterInput
  address: StringFilterInput
  workStartTime: DateFilterInput
  workEndTime: DateFilterInput
  earlyCheckInMinutes: IntFilterInput
  lateCheckInMinutes: IntFilterInput
  earlyCheckOutMinutes: IntFilterInput
  lateCheckOutMinutes: IntFilterInput
  latitude: FloatFilterInput
  longitude: FloatFilterInput
  radius: FloatFilterInput
  maxMembers: IntFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input JobManagerFilterInput {
  id: IDFilterInput
  jobId: IDFilterInput
  userId: IDFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
}

input LeaveRequestFilterInput {
  id: IDFilterInput
  userId: IDFilterInput
  jobId: IDFilterInput
  leaveTypeIn: [LeaveType!]
  startDate: DateFilterInput
  endDate: DateFilterInput
  reason: StringFilterInput
  statusIn: [StatusType!]
  reply: StringFilterInput
  approvedBy: IDFilterInput
  approverAt: DateFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input NotificationFilterInput {
  id: IDFilterInput
  userId: IDFilterInput
  title: StringFilterInput
  content: StringFilterInput
  typeIn: [NotificationType!]
  isRead: BooleanFilterInput
  refType: StringFilterInput
  refId: IDFilterInput
  createdAt: DateFilterInput
  readAt: DateFilterInput
  keyword: String
}

input OvertimeRequestFilterInput {
  id: IDFilterInput
  userId: IDFilterInput
  jobId: IDFilterInput
  date: DateFilterInput
  startTime: DateFilterInput
  endTime: DateFilterInput
  minutes: IntFilterInput
  reason: StringFilterInput
  statusIn: [StatusType!]
  reply: StringFilterInput
  approvedBy: IDFilterInput
  approverAt: DateFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input UserDeviceFilterInput {
  id: IDFilterInput
  userId: IDFilterInput
  deviceId: StringFilterInput
  platform: StringFilterInput
  deviceName: StringFilterInput
  ipAddress: StringFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
}

input UserJoinedJobFilterInput {
  id: IDFilterInput
  userId: IDFilterInput
  jobId: IDFilterInput
  statusIn: [StatusType!]
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
}

input DashboardStatisticsFilterInput {
  fromDate: Date
  toDate: Date
  trendType: StatisticsTrendType = MONTH
  departmentId: ID
  teamId: ID
  jobId: ID
}

# mutation inputs chung
input MarkNotificationAsReadInput {
  notificationId: ID!
}

input MarkAllNotificationsAsReadInput {
  notificationIds: [ID!]
}

input UpdateProfileInput {
  fullName: String
  gender: GenderType
  address: String
  birthday: Date
  avatarUrl: String
  bio: String
}

# mutation inputs employee
input CreateLeaveRequestInput {
  jobId: ID!
  leaveType: LeaveType!
  startDate: Date!
  endDate: Date!
  reason: String!
}

input CreateOvertimeRequestInput {
  jobId: ID!
  date: Date!
  startTime: Date!
  endTime: Date!
  minutes: Int
  reason: String!
}

input CancelLeaveRequestInput {
  leaveRequestId: ID!
  reason: String
}

input CancelOvertimeRequestInput {
  overtimeRequestId: ID!
  reason: String
}

# mutation inputs manager
input ReviewLeaveRequestInput {
  leaveRequestId: ID!
  approve: StatusType!
  reply: String
}

input CreateCompensatoryLeaveRequestForEmployeeInput {
  userId: ID!
  jobId: ID!
  leaveType: LeaveType!
  startDate: Date!
  endDate: Date!
  reason: String!
}

input CreateCompensatoryOvertimeRequestForEmployeeInput {
  userId: ID!
  jobId: ID!
  date: Date!
  startTime: Date!
  endTime: Date!
  minutes: Int!
  reason: String!
}

input ReviewOvertimeRequestInput {
  overtimeRequestId: ID!
  approve: StatusType!
  reply: String
}

input AddEmployeeToJobInput {
  userIds: [ID!]!
  jobId: ID!
}

input RemoveEmployeeFromJobInput {
  userIds: [ID!]!
  jobId: ID!
}

input ReviewAttendanceFraudInput {
  attendanceId: ID!
  isFraud: Boolean!
  fraudReason: String
}

input MarkAttendanceAsFraudByJobInput {
  jobId: ID!
  attendanceId: ID!
  fraudReason: String!
}

# mutation inputs admin
input CreateJobInput {
  title: String!
  description: String
  address: String!
  workStartTime: Date!
  workEndTime: Date!
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  earlyCheckOutMinutes: Int
  lateCheckOutMinutes: Int
  latitude: Float!
  longitude: Float!
  radius: Float!
  maxMembers: Int!
  managerIds: [ID!]
}

input UpdateJobPayloadInput {
  title: String
  description: String
  address: String
  workStartTime: Date
  workEndTime: Date
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  earlyCheckOutMinutes: Int
  lateCheckOutMinutes: Int
  latitude: Float
  longitude: Float
  radius: Float
  maxMembers: Int
  managerIds: [ID!]
}

input UpdateJobInput {
  jobId: ID!
  data: UpdateJobPayloadInput!
}

input DeleteJobInput {
  jobId: ID!
}

input AddManagerToJobInput {
  userIds: [ID!]!
  jobId: ID!
}

input RemoveManagerFromJobInput {
  userIds: [ID!]!
  jobId: ID!
}

input CreateHolidayInput {
  name: String!
  type: HolidayType!
  description: String
  startDate: Date!
  endDate: Date!
  isPaid: Boolean
}

input UpdateHolidayPayloadInput {
  name: String
  type: HolidayType
  description: String
  startDate: Date
  endDate: Date
  isPaid: Boolean
}

input UpdateHolidayInput {
  holidayId: ID!
  data: UpdateHolidayPayloadInput!
}

input DeleteHolidayInput {
  holidayId: ID!
}

input CreateDepartmentInput {
  name: String!
  description: String
}

input UpdateDepartmentInput {
  departmentId: ID!
  name: String
  description: String
}

input DeleteDepartmentInput {
  departmentId: ID!
}

input CreatePositionInput {
  name: String!
  description: String
  departmentId: ID
}

input UpdatePositionInput {
  positionId: ID!
  name: String
  description: String
  departmentId: ID
}

input DeletePositionInput {
  positionId: ID!
}

input CreateUserProfileInput {
  fullName: String
  gender: GenderType
  address: String
  birthday: Date
  avatarUrl: String
  bio: String
}

input CreateUserInput {
  email: String!
  phone: String!
  code: String
  role: Role = EMPLOYEE
  biometricEnabled: Boolean = false
  departmentId: ID
  positionId: ID
  profile: CreateUserProfileInput
}

input UpdateUserInput {
  userId: ID!
  email: String
  phone: String
  code: String
  role: Role
  biometricEnabled: Boolean
  departmentId: ID
  positionId: ID
  profile: CreateUserProfileInput
}

input DeleteUserInput {
  userId: ID!
}

input ResetUserPasswordInput {
  userId: ID!
}


 
`


const queryType = gql`
type Query {
  # query chung 
  # lấy thông báo của người dùng (có phân trang, filter, sort)
  notifications(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: NotificationFilterInput): NotificationCursorListResponse
  # lấy thông tin lịch sử ngày nghỉ lễ (để hiển thị lịch làm việc)
  # sẽ hiển thị từ đầu tháng tới cuối tháng
  holidays(startDate: Date, endDate: Date, filter: HolidayFilterInput): HolidayListResponse
  # lấy thông tin chi tiết của người dùng hiện tại (để hiển thị trang cá nhân)
  # dùng để lấy thông tin profile, vị trí công việc, phòng ban, v.v. của người dùng
  # ping để check token hợp lệ và lấy thông tin người dùng
  me: UserResponse
  # query riêng dành cho employee
  # lấy thông tin chấm công của nhân viên theo khoảng thời gian (để hiển thị lịch sử chấm công)
  # sẽ hiển thị từ đầu tháng tới cuối tháng hoặc theo khoảng thời gian tuỳ chọn
  attendancesByEmployeeByTime(startDate: Date!, endDate: Date!, filter: AttendanceFilterInput): AttendanceListResponse
  # lấy thông tin chấm công của nhân viên theo phân trang cho mobile, filter, sort (để hiển thị lịch sử chấm công có phân trang)
  attendancesByEmployees(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: AttendanceFilterInput): AttendanceCursorListResponse
  # lấy thông tin các yêu cầu nghỉ phép của nhân viên theo phân trang mobile, filter, sort (để hiển thị lịch sử nghỉ phép có phân trang)
  leaveRequestsByEmployee(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: LeaveRequestFilterInput): LeaveRequestCursorListResponse
  # lấy thông tin các yêu cầu làm thêm giờ của nhân viên theo phân trang mobile, filter, sort (để hiển thị lịch sử làm thêm giờ có phân trang)
  overtimeRequestsByEmployee(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: OvertimeRequestFilterInput): OvertimeRequestCursorListResponse
  # thống kê dashboard cho employee
  employeeDashboardStatistics(filter: DashboardStatisticsFilterInput): EmployeeDashboardStatisticsResponse
  # lấy thông tin các công việc mà nhân viên tham gia theo phân trang, filter, sort (để hiển thị danh sách công việc của nhân viên)
  jobsByEmployee(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobListResponse


  # query riêng dành cho manager
  # lấy thông tin các công việc mà manager quản lý theo phân trang, filter, sort (để hiển thị danh sách công việc của manager)
  jobsByManager(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobListResponse
  # lấy thông tin các nhân viên tham gia công việc của manager theo phân trang, filter, sort (để hiển thị danh sách nhân viên theo công việc của manager)
  usersByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserListResponse
  # lấy thông tin các yêu cầu nghỉ phép của nhân viên theo công việc của manager theo phân trang, filter, sort (để hiển thị lịch sử nghỉ phép theo công việc của manager)
  leaveRequestsByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: LeaveRequestFilterInput): LeaveRequestListResponse
  # lấy thông tin các nhân viên chưa tham gia công việc của manager theo phân trang, filter, sort (để hiển thị danh sách nhân viên chưa tham gia công việc của manager)
  searchEmployeesByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserListResponse
  # lấy thông tin các yêu cầu làm thêm giờ của nhân viên theo công việc của manager theo phân trang, filter, sort (để hiển thị lịch sử làm thêm giờ theo công việc của manager)
  overtimeRequestsByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: OvertimeRequestFilterInput): OvertimeRequestListResponse
  # lấy thông tin các chấm công của nhân viên theo công việc của manager theo phân trang, filter, sort (để hiển thị lịch sử chấm công theo công việc của manager)
  attendancesByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: AttendanceFilterInput): AttendanceListResponse
  # thống kê dashboard cho manager / team lead
  managerDashboardStatistics(filter: DashboardStatisticsFilterInput): ManagerDashboardStatisticsResponse



  # query riêng dành cho admin
  # tìm kiếm manager theo tên hoặc email để thêm vào công việc theo phân trang, filter, sort (để hiển thị danh sách manager khi thêm manager vào công việc)
  searchManager(search: String!, filter: UserFilterInput): UserListResponse
  # lấy thông tin tất cả người dùng theo phân trang, filter, sort (để hiển thị danh sách người dùng cho admin)
  users(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserListResponse
  # lấy thông tin tất cả công việc theo phân trang, filter, sort (để hiển thị danh sách công việc cho admin)
  jobs(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobListResponse
  # lấy thông tin tất cả nhật ký hoạt động theo phân trang, filter, sort (để hiển thị danh sách nhật ký hoạt động cho admin)
  auditLogs(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: AuditLogFilterInput): AuditLogListResponse
  # lấy thông tin tất cả ngày nghỉ lễ theo phân trang, filter, sort (để hiển thị danh sách ngày nghỉ lễ cho
  holidaysAdmin(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: HolidayFilterInput): HolidayListResponse
  # lấy thông tin tất cả phòng ban theo phân trang, filter, sort (để hiển thị danh sách phòng ban cho admin)
  departments(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: DepartmentFilterInput): DepartmentListResponse
  # lấy thông tin tất cả vị trí công việc theo phân trang, filter, sort (để hiển thị danh sách vị trí công việc cho admin)
  positions(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: PositionFilterInput): PositionListResponse
  # thống kê dashboard cho admin / hr manager
  adminDashboardStatistics(filter: DashboardStatisticsFilterInput): AdminDashboardStatisticsResponse
  
}
`

const mutationType = gql`
type Mutation {
  # mutation chung
  # đánh dấu đã đọc thông báo của người dùng (để cập nhật trạng thái thông báo)
  markNotificationAsRead(input: MarkNotificationAsReadInput!): NotificationResponse
  # đánh dấu tất cả thông báo của người dùng đã đọc (để cập nhật trạng thái tất cả thông báo)
  markAllNotificationsAsRead(input: MarkAllNotificationsAsReadInput): BaseResponse
  # cập nhật thông tin cá nhân (để nhân viên cập nhật thông tin cá nhân của mình)
  updateProfile(input: UpdateProfileInput!): ProfileResponse

  # mutation riêng dành cho employee
  # tạo yêu cầu nghỉ phép (để nhân viên gửi yêu cầu nghỉ phép)
  createLeaveRequest(input: CreateLeaveRequestInput!): LeaveRequestResponse
  # tạo yêu cầu làm thêm giờ (để nhân viên gửi yêu cầu làm thêm giờ)
  createOvertimeRequest(input: CreateOvertimeRequestInput!): OvertimeRequestResponse
  # huỷ yêu cầu nghỉ phép (để nhân viên huỷ yêu cầu nghỉ phép đã gửi nếu chưa phản hồi)
  cancelLeaveRequest(input: CancelLeaveRequestInput!): LeaveRequestResponse
  # huỷ yêu cầu làm thêm giờ (để nhân viên huỷ yêu cầu làm thêm giờ đã gửi nếu chưa phản hồi)
  cancelOvertimeRequest(input: CancelOvertimeRequestInput!): OvertimeRequestResponse

  # mutation riêng dành cho manager
  # phê duyệt hoặc từ chối yêu cầu nghỉ phép của nhân viên (để manager phản hồi yêu cầu nghỉ phép của nhân viên)
  reviewLeaveRequest(input: ReviewLeaveRequestInput!): LeaveRequestResponse
  # tạo yêu cầu nghỉ phép cho nhân viên (để manager gửi yêu cầu nghỉ phép cho nhân viên nếu cần thiết)
  createCompensatoryLeaveRequestForEmployee(input: CreateCompensatoryLeaveRequestForEmployeeInput!): LeaveRequestResponse
  # tạo yêu cầu làm thêm giờ cho nhân viên (để manager gửi yêu cầu làm thêm giờ cho nhân viên nếu cần thiết)
  createCompensatoryOvertimeRequestForEmployee(input: CreateCompensatoryOvertimeRequestForEmployeeInput!): OvertimeRequestResponse
  # phê duyệt hoặc từ chối yêu cầu làm thêm giờ của nhân viên (để manager phản hồi yêu cầu làm thêm giờ của nhân viên)
  reviewOvertimeRequest(input: ReviewOvertimeRequestInput!): OvertimeRequestResponse
  # thêm nhân viên vào công việc (để manager quản lý nhân viên tham gia công việc của mình)
  addEmployeeToJob(input: AddEmployeeToJobInput!): UserJoinedJobResponse
  # xoá nhân viên khỏi công việc (để manager quản lý nhân viên tham gia công việc của mình)
  removeEmployeeFromJob(input: RemoveEmployeeFromJobInput!): UserJoinedJobResponse
  # phê duyệt hoặc từ chối yêu cầu gian lận chấm công của nhân viên (để manager phản hồi yêu cầu gian lận chấm công của nhân viên)
  reviewAttendanceFraud(input: ReviewAttendanceFraudInput!): AttendanceResponse
  # đánh dấu employee gian lận chấm công (để manager quản lý gian lận chấm công của nhân viên)
  markAttendanceAsFraudByJob(input: MarkAttendanceAsFraudByJobInput!): AttendanceResponse

  # mutation riêng dành cho admin
  # tạo mới công việc (để admin quản lý công việc)
  createJob(input: CreateJobInput!): JobResponse
  # cập nhật công việc (để admin quản lý công việc)
  updateJob(input: UpdateJobInput!): JobResponse
  # xoá công việc (để admin quản lý công việc)
  deleteJob(input: DeleteJobInput!): BaseResponse
  # thêm manager vào công việc (để admin quản lý manager của công việc)
  addManagerToJob(input: AddManagerToJobInput!): JobManagerResponse
  # xoá manager khỏi công việc (để admin quản lý manager của công việc)
  removeManagerFromJob(input: RemoveManagerFromJobInput!): JobManagerResponse
  # tạo mới ngày nghỉ lễ (để admin quản lý ngày nghỉ lễ)
  createHoliday(input: CreateHolidayInput!): HolidayResponse
  # cập nhật ngày nghỉ lễ (để admin quản lý ngày nghỉ lễ)
  updateHoliday(input: UpdateHolidayInput!): HolidayResponse
  # xoá ngày nghỉ lễ (để admin quản lý ngày nghỉ lễ)
  deleteHoliday(input: DeleteHolidayInput!): BaseResponse
  # tạo mới phòng ban (để admin quản lý phòng ban)
  createDepartment(input: CreateDepartmentInput!): DepartmentResponse
  # cập nhật phòng ban (để admin quản lý phòng ban)
  updateDepartment(input: UpdateDepartmentInput!): DepartmentResponse
  # xoá phòng ban (để admin quản lý phòng ban)
  deleteDepartment(input: DeleteDepartmentInput!): BaseResponse
  # tạo mới vị trí công việc (để admin quản lý vị trí công việc)
  createPosition(input: CreatePositionInput!): PositionResponse
  # cập nhật vị trí công việc (để admin quản lý vị trí công việc)
  updatePosition(input: UpdatePositionInput!): PositionResponse
  # xoá vị trí công việc (để admin quản lý vị trí công việc)
  deletePosition(input: DeletePositionInput!): BaseResponse
  # tạo mới người dùng (để admin quản lý người dùng)
  createUser(input: CreateUserInput!): UserResponse
  # cập nhật người dùng (để admin quản lý người dùng)
  updateUser(input: UpdateUserInput!): UserResponse
  # xoá người dùng (để admin quản lý người dùng)
  deleteUser(input: DeleteUserInput!): BaseResponse
  # reset mật khẩu người dùng (để admin quản lý người dùng)
  resetUserPassword(input: ResetUserPasswordInput!): BaseResponse

}
`

const subscriptionType = gql`
type Subscription {

  # subscription chung
  userReceivedNotification: NotificationResponse

  # dành cho employee
  # subscription để nhận trạng thái xin nghỉ phép
  employeeReceivedLeaveRequestStatus: LeaveRequestResponse
  # subscription để nhận trạng thái xin làm thêm giờ
  employeeReceivedOvertimeRequestStatus: OvertimeRequestResponse
  # subscription để nhận trạng thái chấm công (để nhân viên cập nhật giao diện khi có trạng thái chấm công mới)
  employeeReceivedAttendanceStatus: AttendanceResponse
  

  # dành cho manager
  # subscription để nhận yêu cầu nghỉ phép mới của nhân viên (để manager cập nhật giao diện khi có yêu cầu nghỉ phép mới)
  managerReceivedLeaveRequest(jobId: ID!): LeaveRequestResponse
  # subscription để nhận yêu cầu làm thêm giờ mới của nhân viên (để manager cập nhật giao diện khi có yêu cầu làm thêm giờ mới)
  managerReceivedOvertimeRequest(jobId: ID!): OvertimeRequestResponse
  # subscription để nhận chấm công mới của nhân viên (để manager cập nhật giao diện khi có chấm công mới)
  managerReceivedAttendance(jobId: ID!): AttendanceResponse
  # subscription để nhận thông tin người dùng mới tham gia công việc hoặc bị xóa khỏi công việc (để manager cập nhật giao diện khi có thay đổi nhân viên tham gia công việc)
  managerReceivedUserJoinedJob(jobId: ID!): UserJoinedJobResponse
  # subscription để nhận mã QR code động cho chấm công của công việc (để manager hiển thị mã QR code động cho nhân viên chấm công)
  managerReceivedAttendanceQRCodeJob(jobId: ID!): QRCodeResponse
  # thêm sau cho admin
}
`

export const typeDefs = [scalarTypes, enumTypes, inputType, defineType, queryType, mutationType, subscriptionType]