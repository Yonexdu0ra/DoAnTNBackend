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
    isLocked: Boolean
    profile: Profile
    department: Department
    position: Position
    departmentId: ID
    positionId: ID
    deleteAt: Date
    createdAt: Date
    updatedAt: Date
}

type AttendanceMeta {
    ipAddress: String
    deviceId: String
    latitude: Float
    longitude: Float
    # SCAN_QR, COMPENSATORY
    attendanceWith: String
    distance: Float
    attendanceAt: Date
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
  userId: ID
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

# Bảng cáu hình của hệ thống
type Config {
  id: ID!
  key: String!
  value: JSON
  createdAt: Date
  updatedAt: Date
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

# ═══════════════════════════════════════════
# CONNECTION TYPES (page-based)
# ═══════════════════════════════════════════

type PositionConnection {
  nodes: [Position!]!
  pageInfo: PageInfo!
}

type DepartmentConnection {
  nodes: [Department!]!
  pageInfo: PageInfo!
}

type UserConnection {
  nodes: [User!]!
  pageInfo: PageInfo!
}

type AttendanceConnection {
  nodes: [Attendance!]!
  pageInfo: PageInfo!
}

type AuditLogConnection {
  nodes: [AuditLog!]!
  pageInfo: PageInfo!
}

type HolidayConnection {
  nodes: [Holiday!]!
  pageInfo: PageInfo!
}

type JobConnection {
  nodes: [Job!]!
  pageInfo: PageInfo!
}

type LeaveRequestConnection {
  nodes: [LeaveRequest!]!
  pageInfo: PageInfo!
}

type OvertimeRequestConnection {
  nodes: [OvertimeRequest!]!
  pageInfo: PageInfo!
}

type ConfigConnection {
  nodes: [Config!]!
  pageInfo: PageInfo!
}

# ═══════════════════════════════════════════
# CONNECTION TYPES (cursor-based)
# ═══════════════════════════════════════════

type AttendanceCursorConnection {
  nodes: [Attendance!]!
  pageInfo: CursorPageInfo!
}

type LeaveRequestCursorConnection {
  nodes: [LeaveRequest!]!
  pageInfo: CursorPageInfo!
}

type NotificationCursorConnection {
  nodes: [Notification!]!
  pageInfo: CursorPageInfo!
}

type OvertimeRequestCursorConnection {
  nodes: [OvertimeRequest!]!
  pageInfo: CursorPageInfo!
}

# ═══════════════════════════════════════════
# SHARED DASHBOARD BUILDING BLOCKS
# ═══════════════════════════════════════════

# Cảnh báo hiển thị trên dashboard
type DashboardAlert {
  id: ID
  type: String!
  title: String!
  description: String
  severity: String
  dueAt: Date
  isRead: Boolean
}

# Điểm dữ liệu cho biểu đồ đường / cột
type DashboardChartPoint {
  time: String!
  value: Float!
  label: String
}

# Biểu đồ nhiều dòng (multi-series) - ví dụ: so sánh present vs late vs absent
type DashboardChartSeries {
  name: String!
  data: [DashboardChartPoint!]!
}

# Item trong biểu đồ phân phối (pie / donut / bar)
type DashboardDistributionItem {
  label: String!
  value: Float!
  percentage: Float!
}

# Hoạt động gần đây
type DashboardActivity {
  id: ID
  type: String!
  title: String!
  description: String
  status: String
  createdAt: Date
  relatedId: ID
  userName: String
}

# Hành động nhanh
type DashboardQuickAction {
  key: String!
  label: String!
  icon: String
  enabled: Boolean!
  route: String
}

# Card tổng hợp có so sánh trend
type DashboardStatCard {
  label: String!
  value: Float!
  previousValue: Float
  changePercent: Float
  changeDirection: String
}

# ═══════════════════════════════════════════
# ADMIN / HR MANAGER DASHBOARD
# ═══════════════════════════════════════════

# Tổng quan nhân sự
type AdminSummaryStatistics {
  totalEmployees: Int!
  activeEmployees: Int!
  inactiveEmployees: Int!
  lockedEmployees: Int!
  newHiresThisMonth: Int!
  terminationsThisMonth: Int!
  leavesAbsences: Int!
  openJobs: Int!
  totalManagers: Int!
  totalDepartments: Int!
  employeeGrowthPercent: Float
  leaveTrendPercent: Float
}

# Thống kê chấm công hôm nay
type AdminAttendanceStatistics {
  todayCheckIns: Int!
  todayCheckOuts: Int!
  totalRecordsToday: Int!
  onTimeRate: Float!
  lateRate: Float!
  absentRate: Float!
  earlyLeaveRate: Float!
  missingCheckinRate: Float!
  missingCheckoutRate: Float!
  halfDayRate: Float!
  overtimeRate: Float!
  workFromHomeCount: Int!
  businessTripCount: Int!
  fraudCount: Int!
}

# Thống kê nghỉ phép
type AdminLeaveStatistics {
  pendingLeaveRequests: Int!
  approvedLeaves: Int!
  rejectedLeaves: Int!
  canceledLeaves: Int!
  totalLeaveDaysUsed: Float!
  averageLeaveDaysPerEmployee: Float!
  leaveTypeDistribution: [DashboardDistributionItem!]!
  leaveStatusDistribution: [DashboardDistributionItem!]!
}

# Thống kê tăng ca
type AdminOvertimeStatistics {
  pendingOvertimeRequests: Int!
  approvedOvertime: Int!
  rejectedOvertime: Int!
  totalOvertimeMinutes: Int!
  averageOvertimeMinutesPerEmployee: Float!
  overtimeStatusDistribution: [DashboardDistributionItem!]!
}

# Tổng quan công việc
type AdminJobOverviewStatistics {
  totalJobs: Int!
  activeJobs: Int!
  completedJobs: Int!
  upcomingJobs: Int!
  totalCapacity: Int!
  assignedEmployees: Int!
  unassignedEmployees: Int!
  averageManningLevel: Float!
}

# Thống kê thông báo
type AdminNotificationStatistics {
  totalNotifications: Int!
  unreadNotifications: Int!
  notificationTypeDistribution: [DashboardDistributionItem!]!
}

# Biểu đồ cho Admin
type AdminChartsStatistics {
  # Biểu đồ đường: tăng trưởng nhân sự theo thời gian
  workforceGrowth: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng nghỉ phép
  leaveTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng tăng ca
  overtimeTrend: [DashboardChartPoint!]!
  # Biểu đồ tròn: phân phối nhân viên theo phòng ban
  departmentDistribution: [DashboardDistributionItem!]!
  # Biểu đồ tròn: phân phối theo vai trò
  roleDistribution: [DashboardDistributionItem!]!
  # Biểu đồ tròn: phân phối theo chức vụ
  positionDistribution: [DashboardDistributionItem!]!
  # Biểu đồ heatmap: mật độ chấm công theo ngày
  attendanceHeatmap: [DashboardChartPoint!]!
  # Biểu đồ multi-series: so sánh loại chấm công theo thời gian
  attendanceTypeTrend: [DashboardChartSeries!]!
  # Biểu đồ đường: xu hướng gian lận chấm công
  fraudTrend: [DashboardChartPoint!]!
  # Biểu đồ tròn: phân phối giới tính
  genderDistribution: [DashboardDistributionItem!]!
}

type AdminDashboardStatisticsData {
  summary: AdminSummaryStatistics!
  attendanceStats: AdminAttendanceStatistics!
  leaveStats: AdminLeaveStatistics!
  overtimeStats: AdminOvertimeStatistics!
  jobOverview: AdminJobOverviewStatistics!
  notificationStats: AdminNotificationStatistics!
  alerts: [DashboardAlert!]!
  charts: AdminChartsStatistics!
  recentActivities: [DashboardActivity!]!
  quickActions: [DashboardQuickAction!]!
}



# ═══════════════════════════════════════════
# MANAGER DASHBOARD
# ═══════════════════════════════════════════

# KPI đội nhóm hôm nay
type ManagerTeamKpiStatistics {
  totalTeamEmployees: Int!
  presentToday: Int!
  absentToday: Int!
  lateToday: Int!
  onLeaveToday: Int!
  workFromHomeToday: Int!
  onTimeRate: Float!
  attendanceRate: Float!
}

# Thống kê chấm công team
type ManagerAttendanceStatistics {
  totalRecordsInPeriod: Int!
  onTimeRate: Float!
  lateRate: Float!
  absentRate: Float!
  earlyLeaveRate: Float!
  fraudCount: Int!
  attendanceTypeDistribution: [DashboardDistributionItem!]!
}

# Thống kê nghỉ phép team
type ManagerLeaveStatistics {
  pendingTeamLeaveRequests: Int!
  approvedTeamLeavesThisMonth: Int!
  rejectedTeamLeavesThisMonth: Int!
  totalTeamLeaveDaysUsed: Float!
  leaveTypeDistribution: [DashboardDistributionItem!]!
  leaveStatusDistribution: [DashboardDistributionItem!]!
}

# Thống kê tăng ca team
type ManagerOvertimeStatistics {
  pendingTeamOvertimeRequests: Int!
  approvedTeamOvertimeThisMonth: Int!
  totalTeamOvertimeMinutes: Int!
  overtimeStatusDistribution: [DashboardDistributionItem!]!
}

# Trạng thái công việc
type ManagerJobTaskStatusStatistics {
  totalManagedJobs: Int!
  activeJobs: Int!
  upcomingJobs: Int!
  completedJobs: Int!
  totalCapacity: Int!
  averageManningLevel: Float!
  unassignedEmployees: Int!
}

# Biểu đồ cho Manager
type ManagerChartsStatistics {
  # Biểu đồ đường: xu hướng chấm công team
  teamAttendanceTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng nghỉ phép team
  teamLeaveTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng tăng ca team
  teamOvertimeTrend: [DashboardChartPoint!]!
  # Biểu đồ tròn: phân phối trạng thái công việc
  jobStatusDistribution: [DashboardDistributionItem!]!
  # Biểu đồ multi-series: loại chấm công team theo thời gian
  teamAttendanceTypeTrend: [DashboardChartSeries!]!
  # Biểu đồ tròn: phân phối nhân viên theo phòng ban trong team
  teamDepartmentDistribution: [DashboardDistributionItem!]!
  # Biểu đồ heatmap: giờ làm việc team
  teamWorkingHoursHeatmap: [DashboardChartPoint!]!
}

type ManagerDashboardStatisticsData {
  teamKpi: ManagerTeamKpiStatistics!
  attendanceStats: ManagerAttendanceStatistics!
  leaveStats: ManagerLeaveStatistics!
  overtimeStats: ManagerOvertimeStatistics!
  jobTaskStatus: ManagerJobTaskStatusStatistics!
  alerts: [DashboardAlert!]!
  charts: ManagerChartsStatistics!
  recentActivities: [DashboardActivity!]!
  quickActions: [DashboardQuickAction!]!
}



# ═══════════════════════════════════════════
# EMPLOYEE DASHBOARD
# ═══════════════════════════════════════════

# Tổng quan cá nhân
type EmployeePersonalSummaryStatistics {
  todayAttendanceStatus: String
  todayCheckInTime: Date
  todayCheckOutTime: Date
  todayWorkingHours: Float
  currentStreakDays: Int!
  remainingLeaveDays: Float!
  usedLeaveDays: Float!
  totalLeaveDays: Float!
  pendingLeaveRequests: Int!
  pendingOvertimeRequests: Int!
  totalPendingRequests: Int!
  activeJobs: Int!
  totalOvertimeMinutesThisMonth: Int!
  monthlyAttendanceRate: Float!
}

# Thống kê chấm công tháng này
type EmployeeMonthlyAttendanceSummary {
  totalWorkDays: Int!
  presentDays: Int!
  absentDays: Int!
  lateDays: Int!
  earlyLeaveDays: Int!
  onLeaveDays: Int!
  workFromHomeDays: Int!
  overtimeDays: Int!
  attendanceRate: Float!
  onTimeRate: Float!
}

# Cân đối phép chi tiết
type EmployeeLeaveBalanceStatistics {
  totalAnnualLeave: Float!
  usedAnnualLeave: Float!
  remainingAnnualLeave: Float!
  usedSickLeave: Float!
  usedPersonalLeave: Float!
  usedCompensatoryLeave: Float!
  usedUnpaidLeave: Float!
  leaveUsageDistribution: [DashboardDistributionItem!]!
}

# Sự kiện sắp tới
type EmployeeUpcomingEvent {
  id: ID!
  title: String!
  date: Date!
  endDate: Date
  type: String!
  isPaid: Boolean
}

# Biểu đồ cho Employee
type EmployeeChartsStatistics {
  # Biểu đồ đường: xu hướng chấm công cá nhân
  attendanceTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng nghỉ phép cá nhân
  leaveTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng giờ làm việc
  workingHoursTrend: [DashboardChartPoint!]!
  # Biểu đồ đường: xu hướng tăng ca
  overtimeTrend: [DashboardChartPoint!]!
  # Biểu đồ tròn: phân phối loại chấm công
  attendanceTypeDistribution: [DashboardDistributionItem!]!
  # Biểu đồ tròn: phân phối sử dụng phép
  leaveTypeDistribution: [DashboardDistributionItem!]!
  # Biểu đồ đường: xu hướng giờ check-in thực tế
  checkInTimeTrend: [DashboardChartPoint!]!
}

type EmployeeDashboardStatisticsData {
  personalSummary: EmployeePersonalSummaryStatistics!
  monthlyAttendance: EmployeeMonthlyAttendanceSummary!
  leaveBalance: EmployeeLeaveBalanceStatistics!
  alerts: [DashboardAlert!]!
  charts: EmployeeChartsStatistics!
  recentActivities: [DashboardActivity!]!
  upcomingEvents: [EmployeeUpcomingEvent!]!
  quickActions: [DashboardQuickAction!]!
}

type QRCodeData {
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
  userId: IDFilterInput
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

input ConfigFilterInput {
  id: IDFilterInput
  key: StringFilterInput
  createdAt: DateFilterInput
  updatedAt: DateFilterInput
  keyword: String
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

input AttendanceByQRCodeInput {
  qrCodeData: String!
  latitude: Float!
  longitude: Float!
  deviceId: String!
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
  reason: String!
}

input CreateCompensatoryAttendanceForEmployeeInput {
  userId: ID!
  jobId: ID!
  date: Date!
  checkInAt: Date!
  checkOutAt: Date!
  isFraud: Boolean
  fraudReason: String
  reason: String
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
  userId: ID
  description: String
  startDate: Date!
  endDate: Date!
  isPaid: Boolean
}

input UpdateHolidayPayloadInput {
  name: String
  type: HolidayType
  userId: ID
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

input CreateConfigInput {
  key: String!
  value: JSON!
}

input UpdateConfigInput {
  configId: ID!
  key: String
  value: JSON
}

input DeleteConfigInput {
  configId: ID!
}

input ToggleLockUserInput {
  userId: ID!
  isLocked: Boolean!
  reason: String
}


 
`


const queryType = gql`
type Query {
  # query chung 
  notifications(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: NotificationFilterInput): NotificationCursorConnection
  holidays(startDate: Date, endDate: Date, filter: HolidayFilterInput): HolidayConnection
  me: User
  totalMemberJoinedByJobId(jobId: ID!): Int
  totalMemberJoinedByJobIds(jobIds: [ID!]!): [Int!]!
  # query riêng dành cho employee
  attendancesByEmployeeByTime(startDate: Date!, endDate: Date!, filter: AttendanceFilterInput): AttendanceConnection
  attendancesByEmployees(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: AttendanceFilterInput): AttendanceCursorConnection
  leaveRequestsByEmployee(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: LeaveRequestFilterInput): LeaveRequestCursorConnection
  overtimeRequestsByEmployee(pagination: CursorPaginationInput, orderBy: SortOrderInput, filter: OvertimeRequestFilterInput): OvertimeRequestCursorConnection
  employeeDashboardStatistics(filter: DashboardStatisticsFilterInput): EmployeeDashboardStatisticsData
  jobsByEmployee(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobConnection
  
  # lấy các thông tin đơn lẻ theo ID
  attendanceById(id: ID): Attendance
  leaveRequestById(id: ID): LeaveRequest
  overtimeRequestById(id: ID): OvertimeRequest
  jobById(id: ID): Job
  notificationById(id: ID): Notification
  holidayById(id: ID): Holiday
  departmentById(id: ID): Department
  positionById(id: ID): Position
  userById(id: ID): User
  configById(key: String): Config

  # query riêng dành cho manager
  jobsByManager(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobConnection
  usersByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserConnection
  leaveRequestsByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: LeaveRequestFilterInput): LeaveRequestConnection
  searchEmployeesNotInJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserConnection
  searchEmployeesByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserConnection
  overtimeRequestsByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: OvertimeRequestFilterInput): OvertimeRequestConnection
  attendancesByJob(jobId: ID!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: AttendanceFilterInput): AttendanceConnection
  managerDashboardStatistics(filter: DashboardStatisticsFilterInput): ManagerDashboardStatisticsData

  # query riêng dành cho admin
  searchManager(search: String!, filter: UserFilterInput): UserConnection
  searchUser(search: String!, pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserConnection
  users(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: UserFilterInput): UserConnection
  jobs(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: JobFilterInput): JobConnection
  auditLogs(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: AuditLogFilterInput): AuditLogConnection
  holidaysAdmin(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: HolidayFilterInput): HolidayConnection
  departments(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: DepartmentFilterInput): DepartmentConnection
  positions(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: PositionFilterInput): PositionConnection
  adminDashboardStatistics(filter: DashboardStatisticsFilterInput): AdminDashboardStatisticsData
  configs(pagination: PagePaginationInput, orderBy: SortOrderInput, filter: ConfigFilterInput): ConfigConnection
}
`

const mutationType = gql`
type Mutation {
  # mutation chung
  markNotificationAsRead(input: MarkNotificationAsReadInput!): Notification
  markAllNotificationsAsRead(input: MarkAllNotificationsAsReadInput): Boolean
  updateProfile(input: UpdateProfileInput!): Profile

  # mutation riêng dành cho employee
  createLeaveRequest(input: CreateLeaveRequestInput!): LeaveRequest
  createOvertimeRequest(input: CreateOvertimeRequestInput!): OvertimeRequest
  cancelLeaveRequest(input: CancelLeaveRequestInput!): LeaveRequest
  cancelOvertimeRequest(input: CancelOvertimeRequestInput!): OvertimeRequest
  attendanceByQRCode(input: AttendanceByQRCodeInput!): Attendance

  # mutation riêng dành cho manager
  reviewLeaveRequest(input: ReviewLeaveRequestInput!): LeaveRequest
  createCompensatoryLeaveRequestForEmployee(input: CreateCompensatoryLeaveRequestForEmployeeInput!): LeaveRequest
  createCompensatoryOvertimeRequestForEmployee(input: CreateCompensatoryOvertimeRequestForEmployeeInput!): OvertimeRequest
  createCompensatoryAttendanceForEmployee(input: CreateCompensatoryAttendanceForEmployeeInput!): Attendance
  reviewOvertimeRequest(input: ReviewOvertimeRequestInput!): OvertimeRequest
  addEmployeeToJob(input: AddEmployeeToJobInput!): UserJoinedJob
  removeEmployeeFromJob(input: RemoveEmployeeFromJobInput!): UserJoinedJob
  reviewAttendanceFraud(input: ReviewAttendanceFraudInput!): Attendance
  markAttendanceAsFraudByJob(input: MarkAttendanceAsFraudByJobInput!): Attendance

  # mutation riêng dành cho admin
  createJob(input: CreateJobInput!): Job
  updateJob(input: UpdateJobInput!): Job
  deleteJob(input: DeleteJobInput!): Boolean
  addManagerToJob(input: AddManagerToJobInput!): JobManager
  removeManagerFromJob(input: RemoveManagerFromJobInput!): JobManager
  createHoliday(input: CreateHolidayInput!): Holiday
  updateHoliday(input: UpdateHolidayInput!): Holiday
  deleteHoliday(input: DeleteHolidayInput!): Boolean
  createDepartment(input: CreateDepartmentInput!): Department
  updateDepartment(input: UpdateDepartmentInput!): Department
  deleteDepartment(input: DeleteDepartmentInput!): Boolean
  createPosition(input: CreatePositionInput!): Position
  updatePosition(input: UpdatePositionInput!): Position
  deletePosition(input: DeletePositionInput!): Boolean
  createUser(input: CreateUserInput!): User
  updateUser(input: UpdateUserInput!): User
  deleteUser(input: DeleteUserInput!): Boolean
  resetUserPassword(input: ResetUserPasswordInput!): Boolean
  createConfig(input: CreateConfigInput!): Config
  updateConfig(input: UpdateConfigInput!): Config
  deleteConfig(input: DeleteConfigInput!): Config
  toggleLockUser(input: ToggleLockUserInput!): User
}
`

const subscriptionType = gql`
type Subscription {
  # subscription chung
  userReceivedNotification: Notification

  # dành cho employee
  employeeReceivedLeaveRequestStatus: LeaveRequest
  employeeReceivedOvertimeRequestStatus: OvertimeRequest
  employeeReceivedAttendanceStatus: Attendance

  # dành cho manager
  managerReceivedLeaveRequest(jobId: ID!): LeaveRequest
  managerReceivedOvertimeRequest(jobId: ID!): OvertimeRequest
  managerReceivedAttendance(jobId: ID!): Attendance
  managerReceivedUserJoinedJob(jobId: ID!): UserJoinedJob
  managerReceivedAttendanceQRCodeJob(jobId: ID!): QRCodeData
}
`

export const typeDefs = [scalarTypes, enumTypes, inputType, defineType, queryType, mutationType, subscriptionType]