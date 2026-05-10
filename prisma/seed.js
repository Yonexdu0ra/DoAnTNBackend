import prisma from "../src/configs/prismaClient.js";
import bcrypt from "bcrypt";
import { fakerVI as faker } from "@faker-js/faker";

// ======================================================
// CONSTANTS
// ======================================================

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
    PERSONAL_PAID: "PERSONAL_PAID",
    UNPAID: "UNPAID",
    WORK_FROM_HOME: "WORK_FROM_HOME",
    BUSINESS_TRIP: "BUSINESS_TRIP",
};

const ATTENDANCE_TYPE = {
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    LATE: "LATE",
    EARLY_LEAVE: "EARLY_LEAVE",
    LATE_AND_EARLY: "LATE_AND_EARLY",
    OVERTIME: "OVERTIME",
};

const NOTIFICATION_TYPE = {
    SYSTEM: "SYSTEM",
    LEAVE: "LEAVE",
    APPROVAL: "APPROVAL",
    REMINDER: "REMINDER",
};

// ======================================================
// HELPERS
// ======================================================

const passwordHash = await bcrypt.hash("12345678", 10);

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPercent(percent) {
    return Math.random() * 100 < percent;
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function getAllDates(from, to) {
    const dates = [];

    const current = new Date(from);

    while (current <= to) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

function makeTime(hour, minute = 0) {
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

// ======================================================
// CLEAR DATA
// ======================================================

async function clearData() {
    console.log("🧹 Cleaning database...");

    const tables = [
        "auditLog",
        "notification",
        "attendance",
        "overtimeRequest",
        "leaveRequest",
        "userJoinedJob",
        "jobManager",
        "userDevice",
        "session",
        "profile",
        "holiday",
        "job",
        "user",
        "position",
        "department",
        "config",
    ];

    for (const table of tables) {
        if (prisma[table]) {
            await prisma[table].deleteMany();
        }
    }
}

// ======================================================
// CONFIGS
// ======================================================

async function seedConfigs() {
    console.log("⚙️ Seeding configs...");

    await prisma.config.createMany({
        data: [
            {
                key: "ATTENDANCE_POLICY",
                description: "Attendance settings",
                value: {
                    CHECK_IN_EARLY_MINUTES: 15,
                    CHECK_IN_LATE_MINUTES: 15,
                    CHECK_OUT_EARLY_MINUTES: 15,
                },
            },
        ],
    });
}

// ======================================================
// DEPARTMENTS & POSITIONS
// ======================================================

async function seedDepartmentsAndPositions() {
    console.log("🏢 Seeding departments...");

    const departmentsData = [
        "Kỹ Thuật",
        "Nhân Sự",
        "Kế Toán",
        "Marketing",
        "Kinh Doanh",
        "Vận Hành",
        "CSKH",
        "R&D",
    ];

    const positionsData = [
        "Trưởng Phòng",
        "Phó Phòng",
        "Senior",
        "Junior",
        "Intern",
        "Nhân Viên",
    ];

    const departments = [];
    const positions = [];

    for (const deptName of departmentsData) {
        const dept = await prisma.department.create({
            data: {
                name: deptName,
                description: `Phòng ${deptName}`,
            },
        });

        departments.push(dept);

        for (const posName of positionsData) {
            const pos = await prisma.position.create({
                data: {
                    name: `${posName} ${deptName}`,
                    departmentId: dept.id,
                },
            });

            positions.push(pos);
        }
    }

    return {
        departments,
        positions,
    };
}

// ======================================================
// USERS
// ======================================================

async function seedUsers(count, positions) {
    console.log(`👤 Seeding ${count} users...`);

    const users = [];

    const admin = await prisma.user.create({
        data: {
            code: "ADMIN001",
            email: "admin@company.com",
            phone: "0900000000",
            password: passwordHash,
            role: ROLE.ADMIN,
            biometricEnabled: true,

            profile: {
                create: {
                    fullName: "Quản Trị Hệ Thống",
                    gender: GENDER.MALE,
                    birthday: new Date("1995-01-01"),
                    address: "Hà Nội",
                },
            },
        },
    });

    users.push(admin);

    for (let i = 1; i <= count; i++) {
        const role = i <= 30 ? ROLE.MANAGER : ROLE.EMPLOYEE;

        const position = getRandomItem(positions);

        // Growth realistic
        const createdAt =
            Math.random() < 0.7
                ? faker.date.between({
                      from: new Date("2026-01-01"),
                      to: new Date(),
                  })
                : faker.date.between({
                      from: new Date("2024-01-01"),
                      to: new Date("2025-12-31"),
                  });

        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const fullName = `${lastName} ${firstName}`;

        const email = `user${i}@company.com`;

        const user = await prisma.user.create({
            data: {
                code: `${role.slice(0, 3)}${String(i).padStart(4, "0")}`,
                email,
                phone: `0${randomInt(100000000, 999999999)}`,
                password: passwordHash,
                role,
                biometricEnabled: randomPercent(70),

                departmentId: position.departmentId,
                positionId: position.id,

                createdAt,
                updatedAt: createdAt,

                profile: {
                    create: {
                        fullName,
                        gender:
                            Math.random() > 0.5
                                ? GENDER.MALE
                                : GENDER.FEMALE,

                        birthday: faker.date.birthdate({
                            min: 20,
                            max: 45,
                            mode: "age",
                        }),

                        address: faker.location.streetAddress(),

                        bio: faker.person.jobTitle(),

                        avatarUrl: `https://i.pravatar.cc/150?u=${email}`,

                        createdAt,
                        updatedAt: createdAt,
                    },
                },
            },
        });

        users.push(user);
    }

    return users;
}

// ======================================================
// JOBS
// ======================================================

async function seedJobs(managers) {
    console.log("💼 Seeding jobs...");

    const jobs = [];

    for (let i = 1; i <= 15; i++) {
        const createdAt = faker.date.between({
            from: new Date("2024-01-01"),
            to: new Date(),
        });

        const job = await prisma.job.create({
            data: {
                title: `Dự án ${faker.company.name()}`,
                description: faker.lorem.paragraph(),

                address: faker.location.streetAddress(),

                workStartTime: makeTime(8, 0),
                workEndTime: makeTime(17, 30),

                latitude: 21.0285,
                longitude: 105.8542,

                radius: 50,

                maxMembers: randomInt(20, 100),

                createdAt,
                updatedAt: createdAt,
            },
        });

        jobs.push(job);

        const manager = getRandomItem(managers);

        await prisma.jobManager.create({
            data: {
                jobId: job.id,
                userId: manager.id,
                createdAt,
                updatedAt: createdAt,
            },
        });
    }

    return jobs;
}

// ======================================================
// ASSIGNMENTS + ATTENDANCE
// ======================================================

async function seedAssignmentsAndAttendance(users, jobs) {
    console.log("🕒 Seeding attendance...");

    const employees = users.filter(
        (u) => u.role === ROLE.EMPLOYEE
    );

    const today = new Date();

    const attendances = [];

    for (const employee of employees) {
        const joinedAt = employee.createdAt;

        const job = getRandomItem(jobs);

        await prisma.userJoinedJob.create({
            data: {
                userId: employee.id,
                jobId: job.id,
                status: STATUS.APPROVED,
                createdAt: joinedAt,
                updatedAt: joinedAt,
            },
        });

        const dates = getAllDates(joinedAt, today);

        for (const date of dates) {
            if (isWeekend(date)) continue;

            // nghỉ
            if (randomPercent(8)) {
                attendances.push({
                    userId: employee.id,
                    jobId: job.id,

                    date: startOfDay(date),

                    status: STATUS.APPROVED,

                    type: ATTENDANCE_TYPE.ABSENT,

                    createdAt: date,
                    updatedAt: date,
                });

                continue;
            }

            let type = ATTENDANCE_TYPE.PRESENT;

            const late = randomPercent(15);
            const earlyLeave = randomPercent(5);

            if (late && earlyLeave) {
                type = ATTENDANCE_TYPE.LATE_AND_EARLY;
            } else if (late) {
                type = ATTENDANCE_TYPE.LATE;
            } else if (earlyLeave) {
                type = ATTENDANCE_TYPE.EARLY_LEAVE;
            }

            const checkIn = new Date(date);

            checkIn.setHours(
                8,
                late ? randomInt(15, 50) : randomInt(0, 10),
                randomInt(0, 59)
            );

            const checkOut = new Date(date);

            checkOut.setHours(
                earlyLeave ? 16 : 17,
                randomInt(0, 59),
                randomInt(0, 59)
            );

            attendances.push({
                userId: employee.id,
                jobId: job.id,

                date: startOfDay(date),

                status: STATUS.APPROVED,

                type,

                checkInAt: checkIn,
                checkOutAt: checkOut,

                checkInMeta: {
                    attendanceWith: "SCAN_QR",
                    distance: randomInt(1, 30),
                },

                checkOutMeta: {
                    attendanceWith: "SCAN_QR",
                    distance: randomInt(1, 30),
                },

                createdAt: checkIn,
                updatedAt: checkOut,
            });
        }
    }

    const batchSize = 1000;

    for (let i = 0; i < attendances.length; i += batchSize) {
        await prisma.attendance.createMany({
            data: attendances.slice(i, i + batchSize),
        });

        console.log(
            `Attendance ${Math.min(
                i + batchSize,
                attendances.length
            )}/${attendances.length}`
        );
    }
}

// ======================================================
// LEAVE REQUESTS
// ======================================================

async function seedLeaveRequests(users, jobs) {
    console.log("📝 Seeding leave requests...");

    const employees = users.filter(
        (u) => u.role === ROLE.EMPLOYEE
    );

    const managers = users.filter(
        (u) => u.role === ROLE.MANAGER
    );

    const requests = [];

    for (const employee of employees) {
        const leaveCount = randomInt(0, 5);

        for (let i = 0; i < leaveCount; i++) {
            const startDate = faker.date.between({
                from: employee.createdAt,
                to: new Date(),
            });

            const endDate = addDays(
                startDate,
                randomInt(1, 3)
            );

            const manager = getRandomItem(managers);

            requests.push({
                userId: employee.id,

                jobId: getRandomItem(jobs).id,

                leaveType: getRandomItem(
                    Object.values(LEAVE_TYPE)
                ),

                startDate,
                endDate,

                reason: faker.lorem.sentence(),

                status: getRandomItem([
                    STATUS.APPROVED,
                    STATUS.APPROVED,
                    STATUS.APPROVED,
                    STATUS.REJECTED,
                    STATUS.PENDING,
                ]),

                approvedBy: manager.id,

                approverAt: addDays(startDate, -1),

                createdAt: addDays(startDate, -2),

                updatedAt: startDate,
            });
        }
    }

    await prisma.leaveRequest.createMany({
        data: requests,
    });
}

// ======================================================
// OVERTIME
// ======================================================

async function seedOvertimeRequests(users, jobs) {
    console.log("⏰ Seeding overtime requests...");

    const employees = users.filter(
        (u) => u.role === ROLE.EMPLOYEE
    );

    const managers = users.filter(
        (u) => u.role === ROLE.MANAGER
    );

    const requests = [];

    for (const employee of employees) {
        const otCount = randomInt(1, 12);

        for (let i = 0; i < otCount; i++) {
            const date = faker.date.between({
                from: employee.createdAt,
                to: new Date(),
            });

            if (isWeekend(date)) continue;

            const manager = getRandomItem(managers);

            const startTime = new Date(date);
            startTime.setHours(18, 0, 0);

            const endTime = new Date(date);
            endTime.setHours(20, 0, 0);

            requests.push({
                userId: employee.id,

                jobId: getRandomItem(jobs).id,

                date,

                startTime,
                endTime,

                minutes: 120,

                reason: "Tăng ca xử lý công việc",

                status: getRandomItem([
                    STATUS.APPROVED,
                    STATUS.APPROVED,
                    STATUS.PENDING,
                ]),

                approvedBy: manager.id,

                approverAt: date,

                createdAt: addDays(date, -1),

                updatedAt: date,
            });
        }
    }

    await prisma.overtimeRequest.createMany({
        data: requests,
    });
}

// ======================================================
// NOTIFICATIONS
// ======================================================

async function seedNotifications(users) {
    console.log("🔔 Seeding notifications...");

    const titles = [
        "Đơn nghỉ phép đã được duyệt",
        "Bạn đã check-in thành công",
        "Nhắc nhở chấm công",
        "Đơn tăng ca đã được phê duyệt",
        "Thông báo hệ thống",
    ];

    const notifications = [];

    for (let i = 0; i < 1000; i++) {
        const user = getRandomItem(users);

        const createdAt = faker.date.recent({
            days: 90,
        });

        notifications.push({
            userId: user.id,

            title: getRandomItem(titles),

            content: faker.lorem.sentence(),

            type: getRandomItem(
                Object.values(NOTIFICATION_TYPE)
            ),

            isRead: randomPercent(70),

            createdAt,
            // updatedAt: createdAt,
        });
    }

    await prisma.notification.createMany({
        data: notifications,
    });
}

// ======================================================
// MAIN
// ======================================================

async function main() {
    try {
        console.log("🚀 START SEEDING");

        await clearData();

        await seedConfigs();

        const { positions } =
            await seedDepartmentsAndPositions();

        const users = await seedUsers(
            300,
            positions
        );

        const managers = users.filter(
            (u) => u.role === ROLE.MANAGER
        );

        const jobs = await seedJobs(managers);

        await seedAssignmentsAndAttendance(
            users,
            jobs
        );

        await seedLeaveRequests(users, jobs);

        await seedOvertimeRequests(users, jobs);

        await seedNotifications(users);

        console.log("✅ SEED COMPLETED");
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();