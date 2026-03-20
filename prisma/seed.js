
import prisma from '../src/configs/prismaClient.js'
import bcrypt from "bcrypt";

const Role = Object.freeze({
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
});

const StatusType = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELED: "CANCELED",
});

const LeaveType = Object.freeze({
  SICK: "SICK",
  VACATION: "VACATION",
  PERSONAL: "PERSONAL",
  OTHER: "OTHER",
});

const AttendanceType = Object.freeze({
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  EARLY_LEAVE: "EARLY_LEAVE",
  LATE_AND_EARLY: "LATE_AND_EARLY",
  MISSING_CHECKIN: "MISSING_CHECKIN",
  MISSING_CHECKOUT: "MISSING_CHECKOUT",
});

const NotificationType = Object.freeze({
  SYSTEM: "SYSTEM",
  OVERTIME: "OVERTIME",
  LEAVE: "LEAVE",
  APPROVAL: "APPROVAL",
  REMINDER: "REMINDER",
});

const HolidayType = Object.freeze({
  NATIONAL: "NATIONAL",
  RELIGIOUS: "RELIGIOUS",
  CULTURAL: "CULTURAL",
  COMPANY: "COMPANY",
  OTHER: "OTHER",
});


const now = new Date();

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function atTime(baseDate, hour, minute = 0) {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function makeTime(hour, minute = 0) {
  const d = new Date("1970-01-01T00:00:00.000Z");
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function randomToken(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function clearData() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.overtimeRequest.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.userJoinedJob.deleteMany(),
    prisma.jobManager.deleteMany(),
    prisma.userDevice.deleteMany(),
    prisma.session.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.job.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("12345678", 10);

  const users = [
    {
      code: "ADM001",
      email: "admin@acme.vn",
      phone: "0901000001",
      role: Role.ADMIN,
      biometricEnabled: true,
      profile: {
        fullName: "Nguyen Quang Huy",
        address: "12 Nguyen Hue, Quan 1, TP.HCM",
        bio: "System administrator, quan ly he thong va van hanh bao mat.",
      },
    },
    {
      code: "MGR001",
      email: "linh.tran@acme.vn",
      phone: "0901000002",
      role: Role.MANAGER,
      biometricEnabled: true,
      profile: {
        fullName: "Tran Hoang Linh",
        address: "45 Le Loi, Quan 3, TP.HCM",
        bio: "Quan ly phong Ky thuat.",
      },
    },
    {
      code: "MGR002",
      email: "minh.pham@acme.vn",
      phone: "0901000003",
      role: Role.MANAGER,
      biometricEnabled: false,
      profile: {
        fullName: "Pham Duc Minh",
        address: "120 Pham Van Dong, Thu Duc, TP.HCM",
        bio: "Quan ly khoi Van hanh va cham cong.",
      },
    },
    {
      code: "EMP001",
      email: "an.le@acme.vn",
      phone: "0901000101",
      role: Role.EMPLOYEE,
      biometricEnabled: true,
      profile: {
        fullName: "Le Thu An",
        address: "22 Vo Thi Sau, Quan 1, TP.HCM",
        bio: "Backend developer.",
      },
    },
    {
      code: "EMP002",
      email: "khanh.nguyen@acme.vn",
      phone: "0901000102",
      role: Role.EMPLOYEE,
      biometricEnabled: true,
      profile: {
        fullName: "Nguyen Minh Khanh",
        address: "8 Xo Viet Nghe Tinh, Binh Thanh, TP.HCM",
        bio: "Frontend developer, phu trach dashboard.",
      },
    },
    {
      code: "EMP003",
      email: "hoa.vo@acme.vn",
      phone: "0901000103",
      role: Role.EMPLOYEE,
      biometricEnabled: false,
      profile: {
        fullName: "Vo Ngoc Hoa",
        address: "76 Dien Bien Phu, Quan 3, TP.HCM",
        bio: "QA engineer.",
      },
    },
    {
      code: "EMP004",
      email: "tuan.bui@acme.vn",
      phone: "0901000104",
      role: Role.EMPLOYEE,
      biometricEnabled: true,
      profile: {
        fullName: "Bui Anh Tuan",
        address: "15 Phan Dang Luu, Phu Nhuan, TP.HCM",
        bio: "Mobile developer.",
      },
    },
    {
      code: "EMP005",
      email: "mai.do@acme.vn",
      phone: "0901000105",
      role: Role.EMPLOYEE,
      biometricEnabled: false,
      profile: {
        fullName: "Do Thanh Mai",
        address: "101 Hoang Van Thu, Tan Binh, TP.HCM",
        bio: "Nhan su, theo doi phe duyet don.",
      },
    },
    {
      code: "EMP006",
      email: "vinh.ly@acme.vn",
      phone: "0901000106",
      role: Role.EMPLOYEE,
      biometricEnabled: true,
      profile: {
        fullName: "Ly Quoc Vinh",
        address: "9 Quang Trung, Go Vap, TP.HCM",
        bio: "DevOps engineer.",
      },
    },
    {
      code: "EMP007",
      email: "nhung.dang@acme.vn",
      phone: "0901000107",
      role: Role.EMPLOYEE,
      biometricEnabled: false,
      profile: {
        fullName: "Dang Thi Nhung",
        address: "55 Au Co, Tan Phu, TP.HCM",
        bio: "Data analyst.",
      },
    },
  ];

  const created = [];
  for (const user of users) {
    const createdUser = await prisma.user.create({
      data: {
        code: user.code,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        biometricEnabled: user.biometricEnabled,
        role: user.role,
        profile: {
          create: {
            fullName: user.profile.fullName,
            address: user.profile.address,
            bio: user.profile.bio,
          },
        },
      },
      include: { profile: true },
    });

    created.push(createdUser);
  }

  return created;
}

async function seedJobs(users) {
  const managerLinh = users.find((u) => u.code === "MGR001");
  const managerMinh = users.find((u) => u.code === "MGR002");

  const jobs = [
    {
      title: "Ky thuat san pham",
      description: "Phat trien backend, frontend va tich hop API cho he thong noi bo.",
      address: "Tang 5, Toa nha ACME, 120 Nguyen Dinh Chieu, Quan 3, TP.HCM",
      workStartTime: makeTime(8, 30),
      workEndTime: makeTime(17, 30),
      earlyCheckInMinutes: 20,
      lateCheckInMinutes: 15,
      earlyCheckOutMinutes: 10,
      lateCheckOutMinutes: 30,
      latitude: 10.7798,
      longitude: 106.6992,
      radius: 120,
      maxMembers: 20,
    },
    {
      title: "Van hanh he thong",
      description: "Giam sat ha tang, quan ly su co va dam bao SLA dich vu.",
      address: "Tang 2, Trung tam du lieu ACME, Thu Duc, TP.HCM",
      workStartTime: makeTime(9, 0),
      workEndTime: makeTime(18, 0),
      earlyCheckInMinutes: 15,
      lateCheckInMinutes: 20,
      earlyCheckOutMinutes: 15,
      lateCheckOutMinutes: 20,
      latitude: 10.8471,
      longitude: 106.7719,
      radius: 150,
      maxMembers: 15,
    },
    {
      title: "Nhan su va hanh chinh",
      description: "Van hanh quy trinh nhan su, phe duyet nghi phep va cap nhat chinh sach.",
      address: "Tang 3, Toa nha ACME, 120 Nguyen Dinh Chieu, Quan 3, TP.HCM",
      workStartTime: makeTime(8, 0),
      workEndTime: makeTime(17, 0),
      earlyCheckInMinutes: 15,
      lateCheckInMinutes: 10,
      earlyCheckOutMinutes: 10,
      lateCheckOutMinutes: 15,
      latitude: 10.7804,
      longitude: 106.6989,
      radius: 100,
      maxMembers: 10,
    },
  ];

  const jobManagerMap = [
    [managerLinh.id],
    [managerMinh.id],
    [managerLinh.id, managerMinh.id],
  ];

  const createdJobs = [];

  for (const [index, job] of jobs.entries()) {
    const createdJob = await prisma.job.create({ data: job });
    createdJobs.push(createdJob);

    for (const managerId of jobManagerMap[index]) {
      await prisma.jobManager.create({
        data: {
          userId: managerId,
          jobId: createdJob.id,
        },
      });
    }
  }

  return createdJobs;
}

async function seedUserAssignments(users, jobs) {
  const assignmentPlan = [
    ["EMP001", jobs[0].id, StatusType.APPROVED],
    ["EMP002", jobs[0].id, StatusType.APPROVED],
    ["EMP003", jobs[0].id, StatusType.APPROVED],
    ["EMP004", jobs[0].id, StatusType.PENDING],
    ["EMP006", jobs[1].id, StatusType.APPROVED],
    ["EMP007", jobs[1].id, StatusType.APPROVED],
    ["EMP005", jobs[2].id, StatusType.APPROVED],
    ["EMP003", jobs[2].id, StatusType.APPROVED],
    ["EMP004", jobs[1].id, StatusType.REJECTED],
    ["EMP002", jobs[1].id, StatusType.CANCELED],
  ];

  for (const [userCode, jobId, status] of assignmentPlan) {
    const user = users.find((u) => u.code === userCode);
    await prisma.userJoinedJob.create({
      data: {
        userId: user.id,
        jobId,
        status,
      },
    });
  }
}

async function seedSessionsAndDevices(users) {
  const activeUsers = users.filter((u) => u.role !== Role.ADMIN || u.code === "ADM001");

  for (const user of activeUsers) {
    await prisma.session.create({
      data: {
        userId: user.id,
        token: randomToken(`session_${user.code.toLowerCase()}`),
        expiresAt: daysFromNow(7),
        ipAddress: `14.161.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
    });

    await prisma.userDevice.create({
      data: {
        userId: user.id,
        deviceId: `${user.code}-iphone-15-pro`,
        platform: "iOS",
        deviceName: "iPhone 15 Pro",
        fcmToken: randomToken(`fcm_${user.code.toLowerCase()}`),
        ipAddress: `14.161.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
    });

    await prisma.userDevice.create({
      data: {
        userId: user.id,
        deviceId: `${user.code}-macbook-air-m2`,
        platform: "Web",
        deviceName: "MacBook Air M2 - Chrome",
        fcmToken: null,
        ipAddress: `113.161.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
    });
  }
}

async function seedHoliday() {
  const holidays = [
    {
      name: "Tet Duong lich 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-01"),
      isPaid: true,
      type: HolidayType.NATIONAL,
      description: "Nghi le Tet Duong lich tren toan quoc.",
    },
    {
      name: "Gio to Hung Vuong 2026",
      startDate: new Date("2026-04-26"),
      endDate: new Date("2026-04-26"),
      isPaid: true,
      type: HolidayType.CULTURAL,
      description: "Ngay nghi truyen thong Gio to Hung Vuong.",
    },
    {
      name: "30/4 va 1/5",
      startDate: new Date("2026-04-30"),
      endDate: new Date("2026-05-01"),
      isPaid: true,
      type: HolidayType.NATIONAL,
      description: "Giai phong mien Nam va Quoc te Lao dong.",
    },
    {
      name: "Team Building 2026",
      startDate: new Date("2026-08-15"),
      endDate: new Date("2026-08-15"),
      isPaid: true,
      type: HolidayType.COMPANY,
      description: "Nghi 1 ngay tham gia hoat dong team building toan cong ty.",
    },
  ];

  await prisma.holiday.createMany({ data: holidays });
}

async function seedLeaveAndOvertime(users, jobs) {
  const byCode = (code) => users.find((u) => u.code === code);
  const managerLinh = byCode("MGR001");
  const managerMinh = byCode("MGR002");

  await prisma.leaveRequest.createMany({
    data: [
      {
        userId: byCode("EMP001").id,
        jobId: jobs[0].id,
        startDate: daysAgo(12),
        endDate: daysAgo(11),
        leaveType: LeaveType.SICK,
        reason: "Sot cao va viem hong, co giay kham benh.",
        status: StatusType.APPROVED,
        reply: "Da duyet, vui long cap nhat ban giao cong viec.",
        approvedBy: managerLinh.id,
        approverAt: daysAgo(13),
      },
      {
        userId: byCode("EMP003").id,
        jobId: jobs[0].id,
        startDate: daysFromNow(5),
        endDate: daysFromNow(7),
        leaveType: LeaveType.VACATION,
        reason: "Di du lich gia dinh da dat lich truoc.",
        status: StatusType.PENDING,
        reply: null,
        approvedBy: null,
        approverAt: null,
      },
      {
        userId: byCode("EMP005").id,
        jobId: jobs[2].id,
        startDate: daysAgo(4),
        endDate: daysAgo(4),
        leaveType: LeaveType.PERSONAL,
        reason: "Xu ly viec gia dinh dot xuat.",
        status: StatusType.REJECTED,
        reply: "Thoi diem nay phong ban dang cao diem chot bang luong.",
        approvedBy: managerMinh.id,
        approverAt: daysAgo(5),
      },
      {
        userId: byCode("EMP006").id,
        jobId: jobs[1].id,
        startDate: daysFromNow(15),
        endDate: daysFromNow(16),
        leaveType: LeaveType.OTHER,
        reason: "Tham du khoa hoc nang cao chuyen mon.",
        status: StatusType.APPROVED,
        reply: "Da duyet voi dieu kien ban giao ca truc.",
        approvedBy: managerMinh.id,
        approverAt: daysAgo(1),
      },
    ],
  });

  await prisma.overtimeRequest.createMany({
    data: [
      {
        userId: byCode("EMP002").id,
        jobId: jobs[0].id,
        date: daysAgo(3),
        startTime: atTime(daysAgo(3), 18, 30),
        endTime: atTime(daysAgo(3), 21, 0),
        minutes: 150,
        reason: "Hoan tat API payroll truoc han UAT.",
        status: StatusType.APPROVED,
        reply: "Da duyet, ghi nhan OT theo chinh sach du an.",
        approvedBy: managerLinh.id,
        approverAt: daysAgo(2),
      },
      {
        userId: byCode("EMP004").id,
        jobId: jobs[0].id,
        date: daysAgo(1),
        startTime: atTime(daysAgo(1), 19, 0),
        endTime: atTime(daysAgo(1), 22, 0),
        minutes: 180,
        reason: "Fix bug production lien quan dang nhap va session.",
        status: StatusType.PENDING,
        reply: null,
        approvedBy: null,
        approverAt: null,
      },
      {
        userId: byCode("EMP007").id,
        jobId: jobs[1].id,
        date: daysAgo(6),
        startTime: atTime(daysAgo(6), 18, 0),
        endTime: atTime(daysAgo(6), 19, 30),
        minutes: 90,
        reason: "Tong hop dashboard su co he thong thang.",
        status: StatusType.REJECTED,
        reply: "Noi dung cong viec thuoc pham vi nhiem vu trong gio hanh chinh.",
        approvedBy: managerMinh.id,
        approverAt: daysAgo(5),
      },
      {
        userId: byCode("EMP006").id,
        jobId: jobs[1].id,
        date: daysAgo(2),
        startTime: atTime(daysAgo(2), 20, 0),
        endTime: atTime(daysAgo(2), 23, 0),
        minutes: 180,
        reason: "Nang cap he thong CI/CD khung gio it tai.",
        status: StatusType.APPROVED,
        reply: "Da duyet vi anh huong truc tiep den muc tieu uptime.",
        approvedBy: managerMinh.id,
        approverAt: daysAgo(1),
      },
    ],
  });
}

async function seedAttendance(users, jobs) {
  const attendanceSeed = [
    {
      userCode: "EMP001",
      jobId: jobs[0].id,
      dayOffset: 1,
      type: AttendanceType.PRESENT,
      status: StatusType.APPROVED,
      checkIn: [8, 28],
      checkOut: [17, 42],
      isFraud: false,
    },
    {
      userCode: "EMP002",
      jobId: jobs[0].id,
      dayOffset: 1,
      type: AttendanceType.LATE,
      status: StatusType.APPROVED,
      checkIn: [8, 55],
      checkOut: [17, 40],
      isFraud: false,
    },
    {
      userCode: "EMP003",
      jobId: jobs[0].id,
      dayOffset: 1,
      type: AttendanceType.EARLY_LEAVE,
      status: StatusType.APPROVED,
      checkIn: [8, 25],
      checkOut: [16, 45],
      isFraud: false,
    },
    {
      userCode: "EMP004",
      jobId: jobs[0].id,
      dayOffset: 1,
      type: AttendanceType.MISSING_CHECKOUT,
      status: StatusType.PENDING,
      checkIn: [8, 32],
      checkOut: null,
      isFraud: false,
    },
    {
      userCode: "EMP005",
      jobId: jobs[2].id,
      dayOffset: 1,
      type: AttendanceType.PRESENT,
      status: StatusType.APPROVED,
      checkIn: [7, 58],
      checkOut: [17, 5],
      isFraud: false,
    },
    {
      userCode: "EMP006",
      jobId: jobs[1].id,
      dayOffset: 1,
      type: AttendanceType.LATE_AND_EARLY,
      status: StatusType.APPROVED,
      checkIn: [9, 25],
      checkOut: [17, 35],
      isFraud: false,
    },
    {
      userCode: "EMP007",
      jobId: jobs[1].id,
      dayOffset: 1,
      type: AttendanceType.ABSENT,
      status: StatusType.REJECTED,
      checkIn: null,
      checkOut: null,
      isFraud: false,
    },
    {
      userCode: "EMP001",
      jobId: jobs[0].id,
      dayOffset: 2,
      type: AttendanceType.PRESENT,
      status: StatusType.APPROVED,
      checkIn: [8, 20],
      checkOut: [17, 35],
      isFraud: true,
      fraudReason: "Vi tri check-in cach cong ty 2.3km, can xac minh.",
    },
    {
      userCode: "EMP006",
      jobId: jobs[1].id,
      dayOffset: 2,
      type: AttendanceType.MISSING_CHECKIN,
      status: StatusType.PENDING,
      checkIn: null,
      checkOut: [18, 10],
      isFraud: false,
    },
  ];

  for (const row of attendanceSeed) {
    const user = users.find((u) => u.code === row.userCode);
    const attendanceDate = daysAgo(row.dayOffset);
    attendanceDate.setHours(0, 0, 0, 0);

    const checkInAt = row.checkIn ? atTime(attendanceDate, row.checkIn[0], row.checkIn[1]) : null;
    const checkOutAt = row.checkOut ? atTime(attendanceDate, row.checkOut[0], row.checkOut[1]) : null;

    await prisma.attendance.create({
      data: {
        date: attendanceDate,
        status: row.status,
        type: row.type,
        isFraud: row.isFraud,
        fraudReason: row.fraudReason ?? null,
        checkInAt,
        checkOutAt,
        checkInMeta: checkInAt
          ? {
              source: "mobile",
              ipAddress: "14.161.32.10",
              device: "iPhone 15 Pro",
              lat: 10.7799,
              lng: 106.6994,
            }
          : null,
        checkOutMeta: checkOutAt
          ? {
              source: "web",
              ipAddress: "113.161.10.8",
              device: "MacBook Air M2",
              lat: 10.7798,
              lng: 106.6992,
            }
          : null,
        userId: user.id,
        jobId: row.jobId,
      },
    });
  }
}

async function seedNotificationsAndAudit(users) {
  const byCode = (code) => users.find((u) => u.code === code);

  await prisma.notification.createMany({
    data: [
      {
        userId: byCode("EMP002").id,
        title: "Don OT da duoc phe duyet",
        content: "Yeu cau OT ngay hom qua da duoc phe duyet 150 phut.",
        type: NotificationType.OVERTIME,
        isRead: false,
        refType: "OVERTIME_REQUEST",
        refId: "sample-ot-001",
      },
      {
        userId: byCode("EMP003").id,
        title: "Nhac nho cap nhat don nghi",
        content: "Don nghi phep cua ban dang cho phe duyet, vui long bo sung ban giao cong viec.",
        type: NotificationType.REMINDER,
        isRead: true,
        readAt: daysAgo(1),
        refType: "LEAVE_REQUEST",
        refId: "sample-leave-001",
      },
      {
        userId: byCode("MGR001").id,
        title: "Can duyet 2 don nghi phep",
        content: "He thong ghi nhan 2 don nghi phep dang cho duyet trong phong Ky thuat.",
        type: NotificationType.APPROVAL,
        isRead: false,
        refType: "LEAVE_REQUEST",
        refId: null,
      },
      {
        userId: byCode("ADM001").id,
        title: "Canh bao dang nhap bat thuong",
        content: "Phat hien 3 lan dang nhap that bai lien tiep tai tai khoan EMP007.",
        type: NotificationType.SYSTEM,
        isRead: false,
        refType: "SECURITY",
        refId: "audit-security-001",
      },
      {
        userId: byCode("EMP006").id,
        title: "Thong bao lich nghi le",
        content: "Cong ty se nghi Team Building vao ngay 15/08/2026.",
        type: NotificationType.LEAVE,
        isRead: true,
        readAt: daysAgo(2),
        refType: "HOLIDAY",
        refId: "holiday-teambuilding-2026",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: byCode("ADM001").id,
        action: "CREATE_USER",
        resource: "User",
        resourceId: byCode("EMP007").id,
        oldValue: null,
        newValue: { code: "EMP007", role: "EMPLOYEE" },
        ipAddress: "14.161.1.20",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
        status: "SUCCESS",
      },
      {
        userId: byCode("MGR001").id,
        action: "APPROVE_OVERTIME",
        resource: "OvertimeRequest",
        resourceId: "sample-ot-001",
        oldValue: { status: "PENDING" },
        newValue: { status: "APPROVED" },
        ipAddress: "14.161.20.10",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        status: "SUCCESS",
      },
      {
        userId: byCode("MGR002").id,
        action: "REJECT_LEAVE",
        resource: "LeaveRequest",
        resourceId: "sample-leave-005",
        oldValue: { status: "PENDING" },
        newValue: { status: "REJECTED", reason: "high workload" },
        ipAddress: "113.161.8.77",
        userAgent: "PostmanRuntime/7.43.0",
        status: "SUCCESS",
      },
      {
        userId: null,
        action: "LOGIN_FAIL",
        resource: "Auth",
        resourceId: byCode("EMP007").id,
        oldValue: null,
        newValue: { attempts: 3 },
        ipAddress: "203.113.5.201",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
        status: "FAIL",
      },
    ],
  });
}

async function main() {
  console.log("[seed] Start seeding data...");

  await clearData();
  const users = await seedUsers();
  const jobs = await seedJobs(users);
  await seedUserAssignments(users, jobs);
  await seedSessionsAndDevices(users);
  await seedHoliday();
  await seedLeaveAndOvertime(users, jobs);
  await seedAttendance(users, jobs);
  await seedNotificationsAndAudit(users);

  console.log("[seed] Done. Data seeded successfully.");
  console.log(`[seed] Users: ${await prisma.user.count()}`);
  console.log(`[seed] Profiles: ${await prisma.profile.count()}`);
  console.log(`[seed] Jobs: ${await prisma.job.count()}`);
  console.log(`[seed] UserJoinedJobs: ${await prisma.userJoinedJob.count()}`);
  console.log(`[seed] Attendances: ${await prisma.attendance.count()}`);
  console.log(`[seed] LeaveRequests: ${await prisma.leaveRequest.count()}`);
  console.log(`[seed] OvertimeRequests: ${await prisma.overtimeRequest.count()}`);
  console.log(`[seed] Holidays: ${await prisma.holiday.count()}`);
  console.log(`[seed] Notifications: ${await prisma.notification.count()}`);
  console.log(`[seed] AuditLogs: ${await prisma.auditLog.count()}`);
  console.log(`[seed] Sessions: ${await prisma.session.count()}`);
  console.log(`[seed] UserDevices: ${await prisma.userDevice.count()}`);
}

main()
  .catch((error) => {
    console.error("[seed] Error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
