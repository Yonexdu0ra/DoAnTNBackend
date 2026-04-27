
import prisma from '../src/configs/prismaClient.js';
import bcrypt from "bcrypt";
import { fakerVI as faker } from '@faker-js/faker';
import { generateId } from '../src/utils/generateId.js';

// ── CONSTANTS ──

const ROLE = {
    EMPLOYEE: "EMPLOYEE",
    MANAGER: "MANAGER",
    ADMIN: "ADMIN",
};

const GENDER = {
    MALE: "MALE",
    FEMALE: "FEMALE",
};

const STATUS = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELED: "CANCELED",
};

const LEAVE_TYPE = {
    ANNUAL: "ANNUAL",
    SICK: "SICK",
    MATERNITY: "MATERNITY",
    PERSONAL_PAID: "PERSONAL_PAID",
    PERSONAL_UNPAID: "PERSONAL_UNPAID",
    UNPAID: "UNPAID",
    PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY",
    COMPENSATORY: "COMPENSATORY",
    BUSINESS_TRIP: "BUSINESS_TRIP",
    WORK_FROM_HOME: "WORK_FROM_HOME",
    OTHER: "OTHER",
};

const ATTENDANCE_TYPE = {
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    LATE: "LATE",
    EARLY_LEAVE: "EARLY_LEAVE",
    LATE_AND_EARLY: "LATE_AND_EARLY",
    MISSING_CHECKIN: "MISSING_CHECKIN",
    MISSING_CHECKOUT: "MISSING_CHECKOUT",
    ON_LEAVE: "ON_LEAVE",
    HOLIDAY: "HOLIDAY",
    OVERTIME: "OVERTIME",
    WORK_FROM_HOME: "WORK_FROM_HOME",
    BUSINESS_TRIP: "BUSINESS_TRIP",
    HALF_DAY: "HALF_DAY",
    ON_LEAVE_PAID: "ON_LEAVE_PAID",
    UNKNOWN: "UNKNOWN",
};

const NOTIFICATION_TYPE = {
    SYSTEM: "SYSTEM",
    OVERTIME: "OVERTIME",
    LEAVE: "LEAVE",
    APPROVAL: "APPROVAL",
    REMINDER: "REMINDER",
};

const HOLIDAY_TYPE = {
    ANNUAL_LEAVE: "ANNUAL_LEAVE",
    PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY",
    SICK_LEAVE: "SICK_LEAVE",
    MATERNITY_LEAVE: "MATERNITY_LEAVE",
    PAID_PERSONAL_LEAVE: "PAID_PERSONAL_LEAVE",
    UNPAID_LEAVE: "UNPAID_LEAVE",
    COMPENSATORY_LEAVE: "COMPENSATORY_LEAVE",
    COMPANY_LEAVE: "COMPANY_LEAVE",
};

// ── HELPERS ──

const passwordHash = await bcrypt.hash("12345678", 10);

function makeTime(hour, minute = 0) {
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
}

// ── SEED FUNCTIONS ──

async function clearData() {
    console.log("Cleaning up database...");
    const tables = [
        'auditLog', 'notification', 'attendance', 'overtimeRequest', 
        'leaveRequest', 'userJoinedJob', 'jobManager', 'userDevice', 
        'session', 'profile', 'holiday', 'job', 'user', 'position', 'department', 'config'
    ];
    
    for (const table of tables) {
        if (prisma[table]) {
            await prisma[table].deleteMany();
        }
    }
}

async function seedConfigs() {
    console.log("Seeding configs...");
    await prisma.config.createMany({
        data: [
            {
                key: "ATTENDANCE_POLICY",
                description: "Cấu hình quy tắc chấm công",
                value: {
                    TIME_QR_ROTATE_SECONDS: 5,
                    TIME_QR_EXPIRE_SECONDS: 10,
                    CHECK_IN_EARLY_MINUTES: 15,
                    CHECK_IN_LATE_MINUTES: 15,
                    CHECK_OUT_EARLY_MINUTES: 15,
                    CHECK_OUT_LATE_MINUTES: 15,
                }
            },
            {
                key: "SYSTEM_CONFIG",
                description: "Cấu hình hệ thống",
                value: {
                    MAINTENANCE_MODE: false,
                    ALLOWED_IPS: ["*"],
                    VERSION: "1.0.0"
                }
            }
        ]
    });
}

async function seedDepartmentsAndPositions() {
    console.log("Seeding departments and positions...");
    const depts = [
        { name: "Ban Giám Đốc", desc: "Quản trị cao cấp" },
        { name: "Phòng Kỹ Thuật", desc: "Phát triển phần mềm và hạ tầng" },
        { name: "Phòng Nhân Sự", desc: "Tuyển dụng và đào tạo" },
        { name: "Phòng Tài Chính", desc: "Kế toán và ngân sách" },
        { name: "Phòng Kinh Doanh", desc: "Bán hàng và đối tác" },
        { name: "Phòng Marketing", desc: "Truyền thông và thương hiệu" },
        { name: "Phòng Vận Hành", desc: "Điều phối dự án" },
        { name: "Phòng CSKH", desc: "Hỗ trợ khách hàng" },
        { name: "Phòng R&D", desc: "Nghiên cứu và phát triển" },
        { name: "Phòng Pháp Chế", desc: "Tuân thủ pháp luật" }
    ];

    const createdDepts = [];
    for (const d of depts) {
        const dept = await prisma.department.create({
            data: { name: d.name, description: d.desc }
        });
        createdDepts.push(dept);
    }

    const positions = [
        "Giám Đốc", "Trưởng Phòng", "Phó Phòng", "Chuyên Viên Cao Cấp", 
        "Chuyên Viên", "Nhân Viên", "Thực Tập Sinh", "Cố Vấn"
    ];

    const createdPositions = [];
    for (const dept of createdDepts) {
        for (const posName of positions) {
            const pos = await prisma.position.create({
                data: {
                    name: `${posName} ${dept.name}`,
                    departmentId: dept.id
                }
            });
            createdPositions.push(pos);
        }
    }

    return { departments: createdDepts, positions: createdPositions };
}

async function seedUsers(count, { positions }) {
    console.log(`Seeding ${count} users...`);
    const users = [];
    
    // Create 1 super admin
    users.push({
        code: "ADMIN001",
        email: "admin@company.com",
        phone: "0900000000",
        password: passwordHash,
        role: ROLE.ADMIN,
        biometricEnabled: true,
        profile: {
            fullName: "Quản Trị Viên Hệ Thống",
            address: "Thái Nguyên, Việt Nam",
            gender: GENDER.MALE,
            birthday: new Date("1990-01-01"),
            avatarUrl: "https://github.com/shadcn.png"
        }
    });

    for (let i = 2; i <= count; i++) {
        const role = i <= 50 ? ROLE.MANAGER : ROLE.EMPLOYEE;
        const pos = getRandomItem(positions);
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const fullName = `${lastName} ${firstName}`;
        // Ensure unique email and phone
        const email = `${faker.internet.email({ firstName, lastName }).split('@')[0]}${i}@company.com`.toLowerCase();
        const phone = `0${Math.floor(100000000 + Math.random() * 900000000)}`;
        
        users.push({
            code: `${role.substring(0, 3)}${i.toString().padStart(4, '0')}`,
            email: email,
            phone: phone,
            password: passwordHash,
            role: role,
            biometricEnabled: Math.random() > 0.5,
            departmentId: pos.departmentId,
            positionId: pos.id,
            profile: {
                fullName: fullName,
                address: faker.location.streetAddress() + ", " + faker.location.city(),
                gender: Math.random() > 0.5 ? GENDER.MALE : GENDER.FEMALE,
                birthday: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
                bio: faker.lorem.sentence(),
                avatarUrl: `https://i.pravatar.cc/150?u=${email}`
            }
        });
    }

    const createdUsers = [];
    console.log(`Starting to create users in DB. First user sample:`, users[0]);
    for (const userData of users) {
        try {
            const { profile, ...u } = userData;
            const created = await prisma.user.create({
                data: {
                    ...u,
                    profile: { create: profile }
                }
            });
            createdUsers.push(created);
        } catch (e) {
            console.error(`Failed to create user ${userData.code}:`, e.message);
            console.error(`User data attempted:`, userData);
            throw e;
        }
    }
    return createdUsers;
}

async function seedJobs(count, managers) {
    console.log(`Seeding ${count} jobs...`);
    const jobs = [];
    for (let i = 1; i <= count; i++) {
        const job = await prisma.job.create({
            data: {
                title: `Dự án ${faker.company.name()}`,
                description: faker.lorem.paragraph(),
                address: faker.location.streetAddress(),
                workStartTime: makeTime(8, 0),
                workEndTime: makeTime(17, 30),
                latitude: 21.0285 + (Math.random() - 0.5) * 0.1,
                longitude: 105.8542 + (Math.random() - 0.5) * 0.1,
                radius: 100 + Math.random() * 200,
                maxMembers: 50 + Math.floor(Math.random() * 100)
            }
        });
        jobs.push(job);

        // Assign 1-2 managers
        const numManagers = 1 + Math.floor(Math.random() * 2);
        const shuffledManagers = [...managers].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numManagers; j++) {
            await prisma.jobManager.create({
                data: {
                    jobId: job.id,
                    userId: shuffledManagers[j].id
                }
            });
        }
    }
    return jobs;
}

async function seedAssignmentsAndAttendance(users, jobs) {
    console.log("Seeding assignments and attendance...");
    
    const employees = users.filter(u => u.role === ROLE.EMPLOYEE);
    const startDate = new Date("2025-01-01");
    const endDate = new Date();

    const assignments = [];
    const attendances = [];

    for (const employee of employees) {
        const job = getRandomItem(jobs);
        assignments.push({
            userId: employee.id,
            jobId: job.id,
            status: STATUS.APPROVED
        });

        // Seed some attendance records for this employee
        const numRecords = 15 + Math.floor(Math.random() * 20); // More records
        const usedDates = new Set();

        for (let k = 0; k < numRecords; k++) {
            const date = faker.date.between({ from: startDate, to: endDate });
            if (isWeekend(date)) continue;

            const dateOnlyStr = date.toISOString().split('T')[0];
            if (usedDates.has(dateOnlyStr)) continue;
            usedDates.add(dateOnlyStr);

            const dateOnly = new Date(dateOnlyStr);
            
            const checkIn = new Date(dateOnly);
            checkIn.setHours(8, Math.floor(Math.random() * 20));
            
            const checkOut = new Date(dateOnly);
            checkOut.setHours(17, 30 + Math.floor(Math.random() * 30));

            attendances.push({
                userId: employee.id,
                jobId: job.id,
                date: dateOnly,
                status: STATUS.APPROVED,
                type: ATTENDANCE_TYPE.PRESENT,
                checkInAt: checkIn,
                checkOutAt: checkOut,
                checkInMeta: { attendanceWith: "SCAN_QR", distance: Math.random() * 50 },
                checkOutMeta: { attendanceWith: "SCAN_QR", distance: Math.random() * 50 }
            });
        }
    }

    await prisma.userJoinedJob.createMany({ data: assignments });
    
    // Batch attendance creation
    const batchSize = 1000;
    for (let i = 0; i < attendances.length; i += batchSize) {
        try {
            await prisma.attendance.createMany({
                data: attendances.slice(i, i + batchSize)
            });
            console.log(`Seeded ${Math.min(i + batchSize, attendances.length)}/${attendances.length} attendance records...`);
        } catch (e) {
            console.error("Error seeding attendance batch:", e);
            throw e;
        }
    }
}

async function seedRequests(users, jobs) {
    console.log("Seeding requests...");
    const employees = users.filter(u => u.role === ROLE.EMPLOYEE);
    const managers = users.filter(u => u.role === ROLE.MANAGER);

    const leaveRequests = [];
    for (let i = 0; i < 500; i++) {
        const emp = getRandomItem(employees);
        const job = getRandomItem(jobs);
        const mgr = getRandomItem(managers);
        
        const start = faker.date.between({ from: new Date("2025-01-01"), to: new Date("2026-12-31") });
        const end = new Date(start);
        end.setDate(end.getDate() + 1 + Math.floor(Math.random() * 3));

        leaveRequests.push({
            userId: emp.id,
            jobId: job.id,
            leaveType: getRandomItem(Object.values(LEAVE_TYPE)),
            startDate: start,
            endDate: end,
            reason: faker.lorem.sentence(),
            status: getRandomItem(Object.values(STATUS)),
            approvedBy: mgr.id,
            approverAt: new Date()
        });
    }
    await prisma.leaveRequest.createMany({ data: leaveRequests });

    const otRequests = [];
    for (let i = 0; i < 500; i++) {
        const emp = getRandomItem(employees);
        const job = getRandomItem(jobs);
        const mgr = getRandomItem(managers);
        const date = faker.date.recent({ days: 60 });

        otRequests.push({
            userId: emp.id,
            jobId: job.id,
            date: date,
            startTime: new Date(new Date(date).setHours(18, 0)),
            endTime: new Date(new Date(date).setHours(20, 0)),
            minutes: 120,
            reason: faker.lorem.sentence(),
            status: getRandomItem(Object.values(STATUS)),
            approvedBy: mgr.id,
            approverAt: new Date()
        });
    }
    await prisma.overtimeRequest.createMany({ data: otRequests });
}

async function seedHolidays() {
    console.log("Seeding holidays...");
    const holidays = [
        { name: "Tết Dương Lịch", date: "2025-01-01" },
        { name: "Tết Nguyên Đán", date: "2025-01-28" },
        { name: "Giải Phóng Miền Nam", date: "2025-04-30" },
        { name: "Quốc Tế Lao Động", date: "2025-05-01" },
        { name: "Quốc Khánh", date: "2025-09-02" },
        { name: "Tết Dương Lịch 2026", date: "2026-01-01" },
    ];

    for (const h of holidays) {
        await prisma.holiday.create({
            data: {
                name: h.name,
                startDate: new Date(h.date),
                endDate: new Date(h.date),
                type: HOLIDAY_TYPE.PUBLIC_HOLIDAY,
                isPaid: true,
                description: `Ngày nghỉ lễ ${h.name}`
            }
        });
    }
}

async function seedNotifications(users) {
    console.log("Seeding notifications...");
    for (let i = 0; i < 500; i++) {
        const user = getRandomItem(users);
        await prisma.notification.create({
            data: {
                userId: user.id,
                title: faker.lorem.words(3),
                content: faker.lorem.sentence(),
                type: getRandomItem(Object.values(NOTIFICATION_TYPE)),
                isRead: Math.random() > 0.5
            }
        });
    }
}

async function main() {
    try {
        await clearData();
        await seedConfigs();
        const { positions } = await seedDepartmentsAndPositions();
        const users = await seedUsers(500, { positions });
        const managers = users.filter(u => u.role === ROLE.MANAGER);
        const jobs = await seedJobs(20, managers);
        await seedAssignmentsAndAttendance(users, jobs);
        await seedRequests(users, jobs);
        await seedHolidays();
        await seedNotifications(users);

        console.log("Seeding completed successfully!");
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
