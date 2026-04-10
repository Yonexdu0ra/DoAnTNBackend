export const SORT_ORDER_VI = Object.freeze({
  ASC: 'Tăng dần',
  DESC: 'Giảm dần',
})

export const ROLE_VI = Object.freeze({
  EMPLOYEE: 'Nhân viên',
  USER: 'Nhân viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
})

export const GENDER_TYPE_VI = Object.freeze({
  MALE: 'Nam',
  FEMALE: 'Nữ',
})

export const STATUS_TYPE_VI = Object.freeze({
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  CANCELED: 'Đã hủy',
})

export const LEAVE_TYPE_VI = Object.freeze({
  ANNUAL: 'Nghỉ phép năm',
  SICK: 'Nghỉ ốm',
  MATERNITY: 'Nghỉ thai sản',
  PERSONAL_PAID: 'Nghỉ việc riêng có lương',
  PERSONAL_UNPAID: 'Nghỉ việc riêng không lương',
  UNPAID: 'Nghỉ không lương',
  PUBLIC_HOLIDAY: 'Nghỉ lễ/Tết',
  COMPENSATORY: 'Nghỉ bù',
  BUSINESS_TRIP: 'Đi công tác',
  WORK_FROM_HOME: 'Làm việc từ xa',
  OTHER: 'Khác',
})

export const ATTENDANCE_TYPE_VI = Object.freeze({
  PRESENT: 'Đi làm đúng giờ',
  ABSENT: 'Vắng mặt',
  LATE: 'Đi muộn',
  EARLY_LEAVE: 'Về sớm',
  LATE_AND_EARLY: 'Đi muộn và về sớm',
  MISSING_CHECKIN: 'Thiếu check-in',
  MISSING_CHECKOUT: 'Thiếu check-out',
  ON_LEAVE: 'Nghỉ có phép',
  HOLIDAY: 'Ngày nghỉ lễ',
  OVERTIME: 'Làm thêm giờ',
  WORK_FROM_HOME: 'Làm việc từ xa',
  BUSINESS_TRIP: 'Đi công tác',
  HALF_DAY: 'Làm nửa ngày',
  ON_LEAVE_PAID: 'Nghỉ có lương',
  UNKNOWN: 'Chưa xác định',
})

export const NOTIFICATION_TYPE_VI = Object.freeze({
  SYSTEM: 'Hệ thống',
  OVERTIME: 'Làm thêm giờ',
  LEAVE: 'Nghỉ phép',
  APPROVAL: 'Phê duyệt',
  REMINDER: 'Nhắc nhở',
})

export const HOLIDAY_TYPE_VI = Object.freeze({
  ANNUAL_LEAVE: 'Nghỉ phép năm',
  PUBLIC_HOLIDAY: 'Nghỉ lễ/Tết',
  SICK_LEAVE: 'Nghỉ ốm',
  MATERNITY_LEAVE: 'Nghỉ thai sản',
  PAID_PERSONAL_LEAVE: 'Nghỉ việc riêng có lương',
  UNPAID_LEAVE: 'Nghỉ không lương',
  COMPENSATORY_LEAVE: 'Nghỉ bù',
  COMPANY_LEAVE: 'Nghỉ theo chính sách công ty',
})

export const STATISTICS_TREND_TYPE_VI = Object.freeze({
  DAY: 'Theo ngày',
  WEEK: 'Theo tuần',
  MONTH: 'Theo tháng',
  YEAR: 'Theo năm',
})

export const ENUM_TO_VI = Object.freeze({
  SortOrder: SORT_ORDER_VI,
  Role: ROLE_VI,
  GenderType: GENDER_TYPE_VI,
  StatusType: STATUS_TYPE_VI,
  LeaveType: LEAVE_TYPE_VI,
  AttendanceType: ATTENDANCE_TYPE_VI,
  NotificationType: NOTIFICATION_TYPE_VI,
  HolidayType: HOLIDAY_TYPE_VI,
  StatisticsTrendType: STATISTICS_TREND_TYPE_VI,
})

export const toVietnameseEnum = (enumName, value, fallback = value) => {
  if (value === null || value === undefined) return value

  const enumMap = ENUM_TO_VI[enumName]
  if (!enumMap) return fallback

  const normalizedValue = typeof value === 'string' ? value.toUpperCase() : value
  return enumMap[value] ?? enumMap[normalizedValue] ?? fallback
}

export const mapEnumValuesToVietnamese = (enumName, values = []) => {
  if (!Array.isArray(values)) return []

  return values.map((value) => toVietnameseEnum(enumName, value, value))
}

export const getEnumOptionsVi = (enumName) => {
  const enumMap = ENUM_TO_VI[enumName]
  if (!enumMap) return []

  return Object.entries(enumMap).map(([value, label]) => ({ value, label }))
}
