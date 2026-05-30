# 2.4 Thiết kế bảng dữ liệu

## Danh sách các bảng

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 1 | User | Quản lý thông tin tài khoản người dùng |
| 2 | Profile | Thông tin cá nhân chi tiết của người dùng |
| 3 | Session | Quản lý phiên đăng nhập |
| 4 | Biometric | Thông tin sinh trắc học (FaceID, TouchID) |
| 5 | UserDevice | Thông tin thiết bị đăng nhập |
| 6 | Department | Quản lý phòng ban |
| 7 | Position | Quản lý chức vụ |
| 8 | Job | Quản lý công việc / ca làm |
| 9 | JobManager | Quản lý người quản lý công việc |
| 10 | UserJoinedJob | Quản lý người dùng tham gia công việc |
| 11 | Attendance | Quản lý chấm công |
| 12 | LeaveRequest | Quản lý đơn xin nghỉ phép |
| 13 | OvertimeRequest | Quản lý đơn xin làm thêm giờ |
| 14 | Holiday | Quản lý ngày nghỉ lễ |
| 15 | Notification | Quản lý thông báo |
| 16 | Document | Quản lý tài liệu RAG |
| 17 | DocumentChunk | Quản lý đoạn văn bản embedding |
| 18 | Config | Quản lý cấu hình hệ thống |
| 19 | AuditLog | Nhật ký hoạt động hệ thống |

---

## 2.4.1 Bảng User

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| email | varchar(255) | NOT NULL, UNIQUE |
| phone | varchar(20) | NOT NULL, UNIQUE |
| code | varchar(20) | NOT NULL, UNIQUE |
| password | text | NOT NULL |
| biometric_enabled | boolean | NOT NULL, Default: false |
| role | enum('EMPLOYEE', 'MANAGER', 'ADMIN') | NOT NULL, Default: EMPLOYEE |
| department_id | uuid | FOREIGN KEY → Department(id), NULLABLE |
| position_id | uuid | FOREIGN KEY → Position(id), NULLABLE |
| is_locked | boolean | NOT NULL, Default: false |
| deleted_at | timestamp | NULLABLE (soft delete) |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.1** Cấu trúc bảng User

---

## 2.4.2 Bảng Profile

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, UNIQUE, FOREIGN KEY → User(id), ON DELETE CASCADE |
| full_name | varchar(255) | NOT NULL |
| address | text | NOT NULL |
| avatar_url | text | NULLABLE, Default: "https://github.com/shadcn.png" |
| gender | enum('MALE', 'FEMALE') | NOT NULL |
| birthday | timestamp | NOT NULL |
| bio | text | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.2** Cấu trúc bảng Profile

---

## 2.4.3 Bảng Session

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| token | text | NOT NULL, UNIQUE |
| expires_at | timestamp | NOT NULL |
| ip_address | varchar(45) | NOT NULL |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.3** Cấu trúc bảng Session

---

## 2.4.4 Bảng Biometric

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| type | varchar(100) | NOT NULL (VD: "Biometrics", "FaceID", "TouchID") |
| public_key | text | NOT NULL |
| device_id | text | NOT NULL |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.4** Cấu trúc bảng Biometric

---

## 2.4.5 Bảng UserDevice

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| device_id | varchar(255) | NOT NULL |
| device_type (platform) | varchar(50) | NOT NULL (VD: "iOS", "Android", "Web") |
| device_name | varchar(255) | NOT NULL, Default: "Unknown Device" |
| fcm_token | text | NULLABLE |
| ip_address | varchar(45) | NOT NULL |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

**Indexes:**
- `idx_user_device` (user_id, device_id)

> **Bảng 2.5** Cấu trúc bảng UserDevice

---

## 2.4.6 Bảng Department

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| name | text | NOT NULL |
| description | text | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.6** Cấu trúc bảng Department

---

## 2.4.7 Bảng Position

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| name | text | NOT NULL |
| description | text | NULLABLE |
| department_id | uuid | NULLABLE, FOREIGN KEY → Department(id) |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.7** Cấu trúc bảng Position

---

## 2.4.8 Bảng Job

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | NULLABLE |
| address | varchar(255) | NULLABLE |
| work_start_time | time | NOT NULL |
| early_check_in_minutes | int | NOT NULL, Default: 15 |
| late_check_in_minutes | int | NOT NULL, Default: 15 |
| work_end_time | time | NOT NULL |
| early_check_out_minutes | int | NOT NULL, Default: 15 |
| late_check_out_minutes | int | NOT NULL, Default: 15 |
| latitude | float | NOT NULL |
| longitude | float | NOT NULL |
| radius | float | NOT NULL, Default: 50 |
| max_members | int | NOT NULL, Default: 0 |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.8** Cấu trúc bảng Job

---

## 2.4.9 Bảng JobManager

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| job_id | uuid | NOT NULL, FOREIGN KEY → Job(id), ON DELETE CASCADE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.9** Cấu trúc bảng JobManager

---

## 2.4.10 Bảng UserJoinedJob

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| job_id | uuid | NOT NULL, FOREIGN KEY → Job(id), ON DELETE CASCADE |
| status | enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELED') | NOT NULL, Default: PENDING |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

**Unique Constraint:**
- `idx_user_job` (user_id, job_id)

> **Bảng 2.10** Cấu trúc bảng UserJoinedJob

---

## 2.4.11 Bảng Attendance

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| date | date | NOT NULL |
| status | enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELED') | NOT NULL, Default: PENDING |
| type | enum('PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LATE_AND_EARLY', 'MISSING_CHECKIN', 'MISSING_CHECKOUT', 'ON_LEAVE', 'HOLIDAY', 'OVERTIME', 'WORK_FROM_HOME', 'BUSINESS_TRIP', 'HALF_DAY', 'ON_LEAVE_PAID', 'UNKNOWN') | NOT NULL |
| is_fraud | boolean | NOT NULL, Default: false |
| fraud_reason | text | NULLABLE |
| check_in_at | timestamp | NULLABLE |
| check_out_at | timestamp | NULLABLE |
| check_in_meta | json | NULLABLE |
| check_out_meta | json | NULLABLE |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| job_id | uuid | NOT NULL, FOREIGN KEY → Job(id), ON DELETE CASCADE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.11** Cấu trúc bảng Attendance

---

## 2.4.12 Bảng LeaveRequest

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| job_id | uuid | NOT NULL, FOREIGN KEY → Job(id), ON DELETE CASCADE |
| start_date | timestamp | NOT NULL |
| end_date | timestamp | NOT NULL |
| leave_type | enum('ANNUAL', 'SICK', 'MATERNITY', 'PERSONAL_PAID', 'PERSONAL_UNPAID', 'UNPAID', 'PUBLIC_HOLIDAY', 'COMPENSATORY', 'BUSINESS_TRIP', 'WORK_FROM_HOME', 'OTHER') | NOT NULL, Default: OTHER |
| reason | text | NULLABLE |
| status | enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELED') | NOT NULL, Default: PENDING |
| reply | text | NULLABLE (phản hồi từ người duyệt) |
| approver_id | uuid | NULLABLE, FOREIGN KEY → User(id), ON DELETE SET NULL |
| approver_at | timestamp | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.12** Cấu trúc bảng LeaveRequest

---

## 2.4.13 Bảng OvertimeRequest

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL, FOREIGN KEY → User(id), ON DELETE CASCADE |
| job_id | uuid | NOT NULL, FOREIGN KEY → Job(id), ON DELETE CASCADE |
| date | timestamp | NOT NULL (ngày OT) |
| start_time | timestamp | NOT NULL (giờ bắt đầu) |
| end_time | timestamp | NOT NULL (giờ kết thúc) |
| minutes | int | NOT NULL (tổng phút OT) |
| reason | text | NULLABLE |
| status | enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELED') | NOT NULL, Default: PENDING |
| reply | text | NULLABLE (phản hồi từ người duyệt) |
| approver_id | uuid | NULLABLE, FOREIGN KEY → User(id), ON DELETE CASCADE |
| approver_at | timestamp | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.13** Cấu trúc bảng OvertimeRequest

---

## 2.4.14 Bảng Holiday

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| name | varchar(255) | NOT NULL |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL |
| is_paid | boolean | NOT NULL, Default: false |
| holiday_type | enum('ANNUAL_LEAVE', 'PUBLIC_HOLIDAY', 'SICK_LEAVE', 'MATERNITY_LEAVE', 'PAID_PERSONAL_LEAVE', 'UNPAID_LEAVE', 'COMPENSATORY_LEAVE', 'COMPANY_LEAVE') | NOT NULL |
| user_id | uuid | NULLABLE (nghỉ riêng cá nhân) |
| description | text | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.14** Cấu trúc bảng Holiday

---

## 2.4.15 Bảng Notification

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| user_id | uuid | NOT NULL (người nhận) |
| title | varchar(255) | NOT NULL |
| content | text | NOT NULL |
| type | enum('SYSTEM', 'OVERTIME', 'LEAVE', 'APPROVAL', 'REMINDER') | NOT NULL |
| is_read | boolean | NOT NULL, Default: false |
| ref_type | text | NULLABLE (VD: "OVERTIME", "LEAVE", "JOB") |
| ref_id | text | NULLABLE |
| created_at | timestamp | NOT NULL, Default: now() |
| read_at | timestamp | NULLABLE |

**Indexes:**
- `(user_id, is_read)`
- `(type)`

**Table mapping:** `notifications`

> **Bảng 2.15** Cấu trúc bảng Notification

---

## 2.4.16 Bảng Document

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| title | text | NOT NULL |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.16** Cấu trúc bảng Document

---

## 2.4.17 Bảng DocumentChunk

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| document_id | uuid | NOT NULL, FOREIGN KEY → Document(id) |
| content | text | NOT NULL (nội dung đoạn văn bản) |
| chunkIndex | int | NOT NULL (vị trí trong tài liệu gốc) |
| embedding | vector(2048) | NOT NULL (vector embedding từ model plamo) |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

> **Bảng 2.17** Cấu trúc bảng DocumentChunk

---

## 2.4.18 Bảng Config

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| key | text | NOT NULL, UNIQUE |
| value | json | NOT NULL |
| description | text | NOT NULL |
| created_at | timestamp | NOT NULL, Default: now() |
| updated_at | timestamp | NOT NULL, Auto update |

**Indexes:**
- `idx_key` (key)

> **Bảng 2.18** Cấu trúc bảng Config

---

## 2.4.19 Bảng AuditLog

| Tên trường | Kiểu dữ liệu | Ràng buộc |
|------------|---------------|-----------|
| id | uuid(7) | PRIMARY KEY, NOT NULL |
| userId | text | NULLABLE (null nếu hành động do hệ thống thực hiện) |
| action | text | NOT NULL (VD: CREATE_USER, DELETE_LEAVE, LOGIN_FAIL) |
| resource | text | NOT NULL (VD: User, LeaveRequest, Holiday) |
| resourceId | text | NULLABLE (id bản ghi bị tác động) |
| oldValue | json | NULLABLE (dữ liệu trước khi thay đổi) |
| newValue | json | NULLABLE (dữ liệu sau khi thay đổi) |
| ipAddress | text | NULLABLE |
| userAgent | text | NULLABLE |
| status | text | NOT NULL (SUCCESS / FAIL) |
| created_at | timestamp | NOT NULL, Default: now() |

> **Bảng 2.19** Cấu trúc bảng AuditLog

---

## 2.5 Danh sách các Enum

### 2.5.1 Role

| Giá trị | Mô tả |
|---------|-------|
| EMPLOYEE | Nhân viên |
| MANAGER | Quản lý chấm công, duyệt đơn xin nghỉ, OT, xem báo cáo phòng ban |
| ADMIN | Quản lý tài khoản, quyền hạn, cấu hình hệ thống, xuất báo cáo |

> **Bảng 2.20** Enum Role

---

### 2.5.2 GenderType

| Giá trị | Mô tả |
|---------|-------|
| MALE | Nam |
| FEMALE | Nữ |

> **Bảng 2.21** Enum GenderType

---

### 2.5.3 StatusType

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Đang chờ duyệt |
| APPROVED | Đã được duyệt |
| REJECTED | Bị từ chối |
| CANCELED | Đã hủy |

> **Bảng 2.22** Enum StatusType

---

### 2.5.4 LeaveType

| Giá trị | Mô tả |
|---------|-------|
| ANNUAL | Nghỉ phép năm (phép tích lũy) |
| SICK | Nghỉ ốm (có giấy xác nhận y tế) |
| MATERNITY | Nghỉ thai sản |
| PERSONAL_PAID | Nghỉ việc riêng có lương (cưới, tang,...) |
| PERSONAL_UNPAID | Nghỉ việc riêng không lương |
| UNPAID | Nghỉ không lương (xin riêng) |
| PUBLIC_HOLIDAY | Nghỉ lễ, Tết (theo nhà nước) |
| COMPENSATORY | Nghỉ bù (do làm thêm) |
| BUSINESS_TRIP | Đi công tác |
| WORK_FROM_HOME | Làm việc từ xa |
| OTHER | Khác (fallback) |

> **Bảng 2.23** Enum LeaveType

---

### 2.5.5 AttendanceType

| Giá trị | Mô tả |
|---------|-------|
| PRESENT | Đi làm đầy đủ, đúng giờ |
| ABSENT | Vắng mặt không lý do |
| LATE | Đi muộn |
| EARLY_LEAVE | Về sớm |
| LATE_AND_EARLY | Vừa đi muộn vừa về sớm |
| MISSING_CHECKIN | Thiếu check-in |
| MISSING_CHECKOUT | Thiếu check-out |
| ON_LEAVE | Nghỉ có phép (đã được duyệt) |
| HOLIDAY | Nghỉ lễ / ngày nghỉ công ty |
| OVERTIME | Làm thêm giờ |
| WORK_FROM_HOME | Làm việc từ xa (WFH) |
| BUSINESS_TRIP | Đi công tác |
| HALF_DAY | Check-in nhưng không đủ giờ làm (< 50% ngày công) |
| ON_LEAVE_PAID | Nghỉ ốm / thai sản có lương |
| UNKNOWN | Ca làm bị lỗi dữ liệu / chưa xác định |

> **Bảng 2.24** Enum AttendanceType

---

### 2.5.6 NotificationType

| Giá trị | Mô tả |
|---------|-------|
| SYSTEM | Thông báo hệ thống |
| OVERTIME | Liên quan OT |
| LEAVE | Nghỉ phép |
| APPROVAL | Duyệt |
| REMINDER | Nhắc nhở |

> **Bảng 2.25** Enum NotificationType

---

### 2.5.7 HolidayType

| Giá trị | Mô tả |
|---------|-------|
| ANNUAL_LEAVE | Nghỉ phép năm – Có lương (công ty trả) |
| PUBLIC_HOLIDAY | Nghỉ lễ, Tết – Có lương 100% (công ty trả) |
| SICK_LEAVE | Nghỉ ốm – Có lương (BHXH chi trả) |
| MATERNITY_LEAVE | Nghỉ thai sản – Có lương (BHXH chi trả) |
| PAID_PERSONAL_LEAVE | Nghỉ việc riêng có lương (theo luật) |
| UNPAID_LEAVE | Nghỉ không lương |
| COMPENSATORY_LEAVE | Nghỉ bù – Có lương (hoặc đã được trả OT) |
| COMPANY_LEAVE | Nghỉ theo chính sách công ty – Thường có lương |

> **Bảng 2.26** Enum HolidayType

---

## 2.6 Sơ đồ quan hệ giữa các bảng

```
User (1) ──── (1) Profile
User (1) ──── (N) Session
User (1) ──── (N) Biometric
User (1) ──── (N) UserDevice
User (N) ──── (1) Department
User (N) ──── (1) Position
User (1) ──── (N) JobManager
User (1) ──── (N) UserJoinedJob
User (1) ──── (N) Attendance
User (1) ──── (N) LeaveRequest
User (1) ──── (N) OvertimeRequest

Department (1) ──── (N) Position

Job (1) ──── (N) JobManager
Job (1) ──── (N) UserJoinedJob
Job (1) ──── (N) Attendance
Job (1) ──── (N) LeaveRequest
Job (1) ──── (N) OvertimeRequest

Document (1) ──── (N) DocumentChunk

LeaveRequest (N) ──── (1) User [approver]
OvertimeRequest (N) ──── (1) User [approver]
```
