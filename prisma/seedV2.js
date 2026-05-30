import prisma from "../src/configs/prismaClient.js";
import bcrypt from "bcrypt";
import { fakerVI as faker } from "@faker-js/faker";

const getListMonthByYear = (year = 2026, isRangeToCurrentMonth = false) => {
    const listMonth = []
    if (isRangeToCurrentMonth) {
        const currentMonth = new Date().getMonth() + 1
        for (let i = 1; i <= currentMonth; i++) {
            listMonth.push(i)
        }
    } else {
        for (let i = 1; i <= 12; i++) {
            listMonth.push(i)
        }
    }
    return listMonth
}

const getListDayByMonth = (month, year = 2026, isRangeToCurrentDay = false) => {
    const listDay = []
    const maxDay = new Date(year, month, 0).getDate()

    if (!isRangeToCurrentDay) {
        for (let i = 1; i <= maxDay; i++) {
            listDay.push(i)
        }
    } else {
        const currentDay = new Date().getDate()
        for (let i = 1; i <= currentDay; i++) {
            listDay.push(i)
        }
    }
    return listDay
}

const random = (num = 100) => Math.floor(Math.random() * num)

const createDepartments = async () => {
    const departmentsData = [
        "Ban Giám Đốc",
        "Kỹ Thuật",
        "Công Nghệ Thông Tin",
        "Nhân Sự",
        "Hành Chính",
        "Kế Toán",
        "Tài Chính",
        "Marketing",
        "Kinh Doanh",
        "Phát Triển Kinh Doanh",
        "Vận Hành",
        "CSKH",
        "R&D",
        "Sản Xuất",
        "QA/QC",
        "Kiểm Thử",
        "Logistics",
        "Kho Vận",
        "Mua Hàng",
        "Chuỗi Cung Ứng",
        "Pháp Chế",
        "Đào Tạo",
        "Truyền Thông",
        "Thiết Kế",
        "UI/UX",
        "Dữ Liệu",
        "An Ninh Mạng",
        "Hạ Tầng",
        "DevOps",
        "Triển Khai Dự Án",
        "Quản Lý Dự Án",
        "Phân Tích Nghiệp Vụ",
        "Chuyển Đổi Số",
        "Kiểm Soát Nội Bộ",
        "Quan Hệ Khách Hàng",
        "Hỗ Trợ Kỹ Thuật",
        "Bảo Trì",
        "Nghiên Cứu Thị Trường",
        "Xuất Nhập Khẩu",
        "Đối Ngoại",
    ];
    await prisma.department.createMany({
        data: departmentsData.map((name) => ({
            name,
            description: name,
        })),
    });
    const departments = await prisma.department.findMany()
    return departments
}
const departments = await createDepartments()

const createPositions = async (departments) => {
    const departmentPositions = {
        "Ban Giám Đốc": [
            "Tổng Giám Đốc",
            "Phó Tổng Giám Đốc",
            "Giám Đốc Điều Hành",
            "Trợ Lý Giám Đốc",
        ],

        "Kỹ Thuật": [
            "Trưởng Phòng Kỹ Thuật",
            "Phó Phòng Kỹ Thuật",
            "Tech Lead",
            "Kỹ Sư Senior",
            "Kỹ Sư",
            "Kỹ Thuật Viên",
            "Thực Tập Sinh",
        ],

        "Công Nghệ Thông Tin": [
            "IT Manager",
            "System Admin",
            "Backend Developer",
            "Frontend Developer",
            "Mobile Developer",
            "Fullstack Developer",
            "DevOps Engineer",
            "IT Support",
            "Intern Developer",
        ],

        "Nhân Sự": [
            "HR Manager",
            "HR Leader",
            "Chuyên Viên Tuyển Dụng",
            "Chuyên Viên C&B",
            "HR Admin",
            "HR Intern",
        ],

        "Hành Chính": [
            "Trưởng Phòng Hành Chính",
            "Nhân Viên Hành Chính",
            "Lễ Tân",
            "Văn Thư",
        ],

        "Kế Toán": [
            "Kế Toán Trưởng",
            "Kế Toán Tổng Hợp",
            "Kế Toán Nội Bộ",
            "Kế Toán Thuế",
            "Thủ Quỹ",
        ],

        "Tài Chính": [
            "Finance Manager",
            "Financial Analyst",
            "Chuyên Viên Đầu Tư",
            "Kiểm Soát Tài Chính",
        ],

        "Marketing": [
            "Marketing Manager",
            "Content Marketing",
            "Digital Marketing",
            "SEO Specialist",
            "Ads Specialist",
            "Designer",
            "Marketing Intern",
        ],

        "Kinh Doanh": [
            "Sales Director",
            "Sales Manager",
            "Sales Leader",
            "Business Development",
            "Sales Executive",
            "Telesales",
            "Sales Admin",
        ],

        "Phát Triển Kinh Doanh": [
            "Business Development Manager",
            "Partnership Executive",
            "Account Manager",
            "Customer Success",
        ],

        "Vận Hành": [
            "Operation Manager",
            "Operation Executive",
            "Điều Phối Viên",
            "Giám Sát Vận Hành",
        ],

        "CSKH": [
            "Customer Service Manager",
            "Customer Support",
            "Call Center Agent",
            "Chăm Sóc Khách Hàng Online",
        ],

        "R&D": [
            "R&D Manager",
            "Research Engineer",
            "Product Researcher",
            "AI Engineer",
            "Data Scientist",
        ],

        "Sản Xuất": [
            "Quản Đốc",
            "Giám Sát Sản Xuất",
            "Tổ Trưởng",
            "Công Nhân",
        ],

        "QA/QC": [
            "QA Manager",
            "QC Leader",
            "QA Engineer",
            "QC Staff",
            "Tester",
        ],

        "Kiểm Thử": [
            "Test Manager",
            "Manual Tester",
            "Automation Tester",
            "Performance Tester",
        ],

        "Logistics": [
            "Logistics Manager",
            "Điều Phối Logistics",
            "Nhân Viên Giao Nhận",
        ],

        "Kho Vận": [
            "Warehouse Manager",
            "Thủ Kho",
            "Nhân Viên Kho",
        ],

        "Mua Hàng": [
            "Purchasing Manager",
            "Buyer",
            "Purchasing Staff",
        ],

        "Chuỗi Cung Ứng": [
            "Supply Chain Manager",
            "Supply Planner",
            "Demand Planner",
        ],

        "Pháp Chế": [
            "Legal Manager",
            "Legal Advisor",
            "Chuyên Viên Pháp Lý",
        ],

        "Đào Tạo": [
            "Training Manager",
            "Trainer",
            "Instructional Designer",
        ],

        "Truyền Thông": [
            "Communication Manager",
            "PR Executive",
            "Content Creator",
        ],

        "Thiết Kế": [
            "Design Manager",
            "Graphic Designer",
            "Motion Designer",
            "2D Designer",
            "3D Designer",
        ],

        "UI/UX": [
            "UI Designer",
            "UX Designer",
            "Product Designer",
            "UX Researcher",
        ],

        "Dữ Liệu": [
            "Data Engineer",
            "Data Analyst",
            "Data Scientist",
            "BI Developer",
        ],

        "An Ninh Mạng": [
            "Security Manager",
            "Security Engineer",
            "SOC Analyst",
            "Penetration Tester",
        ],

        "Hạ Tầng": [
            "Infrastructure Manager",
            "Cloud Engineer",
            "System Engineer",
            "Network Engineer",
        ],

        "DevOps": [
            "DevOps Lead",
            "DevOps Engineer",
            "SRE Engineer",
            "Platform Engineer",
        ],

        "Triển Khai Dự Án": [
            "Implementation Manager",
            "Implementation Specialist",
            "Deployment Engineer",
        ],

        "Quản Lý Dự Án": [
            "Project Manager",
            "Project Coordinator",
            "Scrum Master",
            "PMO",
        ],

        "Phân Tích Nghiệp Vụ": [
            "Business Analyst",
            "System Analyst",
            "Product Analyst",
        ],

        "Chuyển Đổi Số": [
            "Digital Transformation Manager",
            "Transformation Consultant",
            "Process Analyst",
        ],

        "Kiểm Soát Nội Bộ": [
            "Internal Control Manager",
            "Internal Auditor",
            "Compliance Officer",
        ],

        "Quan Hệ Khách Hàng": [
            "CRM Manager",
            "Account Executive",
            "Customer Relationship Specialist",
        ],

        "Hỗ Trợ Kỹ Thuật": [
            "Technical Support Manager",
            "Support Engineer",
            "Helpdesk",
        ],

        "Bảo Trì": [
            "Maintenance Manager",
            "Maintenance Engineer",
            "Maintenance Technician",
        ],

        "Nghiên Cứu Thị Trường": [
            "Market Research Manager",
            "Research Analyst",
            "Survey Executive",
        ],

        "Xuất Nhập Khẩu": [
            "Import Export Manager",
            "Customs Specialist",
            "Export Staff",
        ],

        "Đối Ngoại": [
            "External Relations Manager",
            "Partnership Specialist",
            "Public Affairs Executive",
        ],
    };
    for (const department of departments) {
        const listPositions = departmentPositions[department.name]
        for (const position of listPositions) {
            await prisma.position.create({
                data: {
                    name: position,
                    departmentId: department.id,
                }
            })
        }
    }
    return await prisma.position.findMany()
}
const positions = await createPositions(departments)


const createUser = async (totalUser = 1000, departments, positions) => {
    const passwordHash = await bcrypt.hash("12345678", 10)
    const profile = {
        fullName: "Phạm Ngọc Quý",
        gender: "MALE",
        birthday: new Date("2003-03-07"),
        address: "Thái Nguyên",
    }


    const admin = await prisma.user.create({
        data: {
            code: "ADMIN001",
            email: "nguoidungemail1@gmail.com",
            phone: "0900000000",
            password: passwordHash,
            role: "ADMIN",
            profile: {
                create: profile,
            },
        }
    })
    const manager = await prisma.user.create({
        data: {
            code: "MANAGER001",
            email: "qingusi1@gmail.com",
            phone: "0900000001",
            password: passwordHash,
            role: "MANAGER",
            profile: {
                create: profile,
            },
        }
    })
    const user = await prisma.user.create({
        data: {
            code: "USER001",
            email: "dtc225180267@ictu.edu.vn",
            phone: "0900000002",
            password: passwordHash,
            role: "EMPLOYEE",
            profile: {
                create: profile,
            },
        }
    })
    // đếm số user tạo mới 
    let index = 1
    const listMonthYear2026 = getListMonthByYear(2026)
    // lặp qua từng tháng
    for (const month of listMonthYear2026) {
        const listDayInMonth = getListDayByMonth(month, 2026)
        // lặp qua từng ngày
        for (const day of listDayInMonth) {
            // random số user trong 1 ngày 
            const userNumber = random(5)
            if (userNumber > 0) {
                // tạo user theo số random
                for (let i = 0; i < userNumber; i++) {
                    const ngay = new Date(2026, month - 1, day)
                    const randomPosition = faker.helpers.arrayElement(positions)
                    await prisma.user.create({
                        data: {
                            code: `TC`,
                            email: `user${index}@qujs.online`,
                            password: passwordHash,
                            role: "EMPLOYEE",
                            phone: faker.phone.number(),
                            position: {
                                connect: {
                                    id: randomPosition.id
                                }
                            },
                            department: {
                                connect: {
                                    id: randomPosition.departmentId
                                }
                            },
                            createdAt: ngay,
                            updatedAt: ngay,
                            profile: {
                                create: {
                                    ...profile,
                                    fullName: `Nhân viên ${index}`,
                                    birthday: faker.date.birthdate(),
                                    gender: faker.helpers.arrayElement(["MALE", "FEMALE"]),
                                    address: faker.location.streetAddress(),
                                }
                            }

                        }
                    })
                    index++
                }
            }

        }
    }
    return await prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: { id: true } })

}

const users = await createUser(1000, departments, positions)

// ====== TẠO DANH SÁCH QUẢN LÝ (role MANAGER) ======
const createManagers = async (jobs, positions) => {
    const passwordHash = await bcrypt.hash("12345678", 10)
    const managers = []
    // Tạo 2 manager cho mỗi job = 20 managers
    for (let i = 0; i < jobs.length * 2; i++) {
        const randomPosition = faker.helpers.arrayElement(positions)
        const gender = faker.helpers.arrayElement(["MALE", "FEMALE"])
        const mgr = await prisma.user.create({
            data: {
                code: `MGR${String(i + 1).padStart(3, '0')}`,
                email: `manager${i + 1}@qujs.online`,
                phone: faker.phone.number(),
                password: passwordHash,
                role: "MANAGER",
                departmentId: randomPosition.departmentId,
                positionId: randomPosition.id,
                profile: {
                    create: {
                        fullName: faker.person.fullName({ sex: gender.toLowerCase() }),
                        gender: gender,
                        birthday: faker.date.birthdate({ min: 28, max: 50, mode: 'age' }),
                        address: faker.location.city(),
                    }
                }
            }
        })
        managers.push(mgr)
    }
    console.log(`Đã tạo ${managers.length} quản lý (role MANAGER)`)
    return managers
}

// ====== TẠO NHIỀU CÔNG VIỆC ======
const createJobs = async () => {
    const jobsData = [
        {
            title: "Ca hành chính - Trụ sở Hà Nội",
            description: "Làm việc giờ hành chính tại trụ sở chính Hà Nội",
            address: "Tầng 12, Tòa nhà Keangnam, Phạm Hùng, Nam Từ Liêm, Hà Nội",
            workStartTime: new Date("1970-01-01T08:00:00Z"),
            workEndTime: new Date("1970-01-01T17:00:00Z"),
            latitude: 21.028511, longitude: 105.804817, radius: 10,
            maxMembers: 100,
        },
        {
            title: "Ca hành chính - Chi nhánh HCM",
            description: "Làm việc giờ hành chính tại chi nhánh TP.HCM",
            address: "Tầng 8, Tòa nhà Bitexco, 2 Hải Triều, Quận 1, TP.HCM",
            workStartTime: new Date("1970-01-01T08:00:00Z"),
            workEndTime: new Date("1970-01-01T17:00:00Z"),
            latitude: 10.776889, longitude: 106.700806, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca hành chính - Chi nhánh Đà Nẵng",
            description: "Làm việc giờ hành chính tại chi nhánh Đà Nẵng",
            address: "Tầng 5, Tòa nhà Indochina Riverside, 74 Bạch Đằng, Hải Châu, Đà Nẵng",
            workStartTime: new Date("1970-01-01T08:00:00Z"),
            workEndTime: new Date("1970-01-01T17:00:00Z"),
            latitude: 16.047079, longitude: 108.206230, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca sáng - Nhà máy sản xuất",
            description: "Ca sáng tại nhà máy sản xuất",
            address: "Lô B2, KCN Thăng Long, Đông Anh, Hà Nội",
            workStartTime: new Date("1970-01-01T06:00:00Z"),
            workEndTime: new Date("1970-01-01T14:00:00Z"),
            latitude: 21.005000, longitude: 105.820000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca chiều - Nhà máy sản xuất",
            description: "Ca chiều tại nhà máy sản xuất",
            address: "Lô B2, KCN Thăng Long, Đông Anh, Hà Nội",
            workStartTime: new Date("1970-01-01T14:00:00Z"),
            workEndTime: new Date("1970-01-01T22:00:00Z"),
            latitude: 21.005000, longitude: 105.820000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca hành chính - Kho Logistics",
            description: "Làm việc tại trung tâm kho vận",
            address: "Lô C5, KCN Nội Bài, Sóc Sơn, Hà Nội",
            workStartTime: new Date("1970-01-01T07:30:00Z"),
            workEndTime: new Date("1970-01-01T16:30:00Z"),
            latitude: 20.980000, longitude: 105.790000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca linh hoạt - R&D Lab",
            description: "Nghiên cứu và phát triển, giờ linh hoạt",
            address: "Tầng 15, Tòa nhà FPT Tower, 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội",
            workStartTime: new Date("1970-01-01T09:00:00Z"),
            workEndTime: new Date("1970-01-01T18:00:00Z"),
            latitude: 21.030000, longitude: 105.810000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca hành chính - CSKH",
            description: "Trung tâm chăm sóc khách hàng",
            address: "Tầng 3, Tòa nhà Hà Nội Tower, 49 Hai Bà Trưng, Hoàn Kiếm, Hà Nội",
            workStartTime: new Date("1970-01-01T08:00:00Z"),
            workEndTime: new Date("1970-01-01T17:00:00Z"),
            latitude: 21.025000, longitude: 105.800000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca hành chính - Văn phòng Kinh doanh",
            description: "Phòng kinh doanh và phát triển thị trường",
            address: "Tầng 10, Tòa nhà Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội",
            workStartTime: new Date("1970-01-01T08:30:00Z"),
            workEndTime: new Date("1970-01-01T17:30:00Z"),
            latitude: 21.020000, longitude: 105.815000, radius: 10,
            maxMembers: 100
        },
        {
            title: "Ca đêm - Vận hành hệ thống",
            description: "Giám sát và vận hành hệ thống ban đêm",
            address: "Tầng 12, Tòa nhà Keangnam, Phạm Hùng, Nam Từ Liêm, Hà Nội",
            workStartTime: new Date("1970-01-01T22:00:00Z"),
            workEndTime: new Date("1970-01-02T06:00:00Z"),
            latitude: 21.028511, longitude: 105.804817, radius: 10,
            maxMembers: 100
        },
    ];

    const createdJobs = [];
    for (const jobData of jobsData) {
        const job = await prisma.job.create({ data: jobData });
        createdJobs.push(job);
    }
    console.log(`Đã tạo ${createdJobs.length} công việc`);
    return createdJobs;
}

// ====== GÁN QUẢN LÝ CHO TỪNG CÔNG VIỆC ======
const createJobManagers = async (managers, jobs) => {
    const jobManagerData = [];

    for (let i = 0; i < jobs.length; i++) {
        // Mỗi job có 2 quản lý từ danh sách managers
        const mgr1 = managers[i * 2];
        const mgr2 = managers[i * 2 + 1];
        jobManagerData.push({ userId: mgr1.id, jobId: jobs[i].id });
        if (mgr2) {
            jobManagerData.push({ userId: mgr2.id, jobId: jobs[i].id });
        }
    }

    await prisma.jobManager.createMany({ data: jobManagerData });
    console.log(`Đã gán ${jobManagerData.length} quản lý cho ${jobs.length} công việc`);
    return jobManagerData;
}

// ====== PHÂN BỔ USER VÀO CÁC CÔNG VIỆC ======
const createUserJoinedJobs = async (users, managers, jobs) => {
    const joinData = [];
    // Tạo map userId -> jobId để dùng cho attendance
    const userJobMap = new Map();

    // Các manager tham gia job mà họ quản lý
    for (let i = 0; i < jobs.length; i++) {
        const mgr1 = managers[i * 2];
        const mgr2 = managers[i * 2 + 1];
        joinData.push({ userId: mgr1.id, jobId: jobs[i].id, status: "APPROVED" });
        userJobMap.set(mgr1.id, jobs[i].id);
        if (mgr2) {
            joinData.push({ userId: mgr2.id, jobId: jobs[i].id, status: "APPROVED" });
            userJobMap.set(mgr2.id, jobs[i].id);
        }
    }

    // Phân bổ nhân viên (EMPLOYEE) đều vào các công việc
    for (let i = 0; i < users.length; i++) {
        const job = jobs[i % jobs.length];
        joinData.push({ userId: users[i].id, jobId: job.id, status: "APPROVED" });
        userJobMap.set(users[i].id, job.id);
    }

    const chunkSize = 5000;
    for (let i = 0; i < joinData.length; i += chunkSize) {
        await prisma.userJoinedJob.createMany({ data: joinData.slice(i, i + chunkSize) });
    }
    console.log(`Đã phân bổ ${joinData.length} user (${managers.length} managers + ${users.length} employees) vào ${jobs.length} công việc`);
    return userJobMap;
}

// ====== TẠO CHẤM CÔNG, OT, NGHỈ PHÉP ======
const createAttendanceAndRequests = async (allUsers, jobs, userJobMap) => {
    const attendances = [];
    const overtimes = [];
    const leaves = [];

    // Tạo map jobId -> job data để lấy giờ làm việc
    const jobMap = new Map();
    for (const job of jobs) {
        jobMap.set(job.id, job);
    }

    const startYear = 2026;
    const currentMonth = new Date().getMonth() + 1;
    const currentDay = new Date().getDate();

    console.log("Bắt đầu tạo dữ liệu chấm công, OT, nghỉ phép...");
    for (let m = 1; m <= currentMonth; m++) {
        const maxDay = (m === currentMonth) ? currentDay : new Date(startYear, m, 0).getDate();
        for (let d = 1; d <= maxDay; d++) {
            const date = new Date(Date.UTC(startYear, m - 1, d, 0, 0, 0));
            const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

            for (const user of allUsers) {
                const jobId = userJobMap.get(user.id);
                if (!jobId) continue; // user chưa được gán job
                const job = jobMap.get(jobId);
                if (!job) continue;

                // Lấy giờ bắt đầu/kết thúc từ job
                const startHour = job.workStartTime.getUTCHours();
                const endHour = job.workEndTime.getUTCHours();

                if (isWeekend) {
                    // OT cuối tuần (2% chance)
                    if (Math.random() < 0.02) {
                        overtimes.push({
                            userId: user.id,
                            jobId: jobId,
                            date: date,
                            startTime: new Date(Date.UTC(startYear, m - 1, d, startHour, 0, 0)),
                            endTime: new Date(Date.UTC(startYear, m - 1, d, startHour + 4, 0, 0)),
                            minutes: 240,
                            reason: faker.helpers.arrayElement(["Làm thêm cuối tuần", "Xử lý sự cố", "Dự án gấp", "Bàn giao công việc"]),
                            status: faker.helpers.arrayElement(["APPROVED", "APPROVED", "APPROVED", "PENDING"]),
                        });
                    }
                } else {
                    const rand = Math.random();
                    if (rand < 0.05) {
                        // Nghỉ phép (5%)
                        const leaveStatus = faker.helpers.arrayElement(["APPROVED", "APPROVED", "APPROVED", "PENDING", "REJECTED"]);
                        leaves.push({
                            userId: user.id,
                            jobId: jobId,
                            startDate: date,
                            endDate: date,
                            leaveType: faker.helpers.arrayElement(["ANNUAL", "SICK", "PERSONAL_PAID", "UNPAID", "COMPENSATORY"]),
                            reason: faker.helpers.arrayElement([
                                "Việc cá nhân", "Đi khám bệnh", "Về quê", "Nghỉ ốm",
                                "Đám cưới", "Chăm con ốm", "Việc gia đình", "Nghỉ bù OT"
                            ]),
                            status: leaveStatus,
                        });
                    } else {
                        // Chấm công hàng ngày
                        const checkInMinutes = faker.number.int({ min: -15, max: 30 });
                        const checkOutMinutes = faker.number.int({ min: -30, max: 60 });

                        const checkInTime = new Date(Date.UTC(startYear, m - 1, d, startHour, checkInMinutes, 0));
                        const checkOutTime = new Date(Date.UTC(startYear, m - 1, d, endHour, checkOutMinutes, 0));

                        let type = "PRESENT";
                        if (checkInMinutes > 15 && checkOutMinutes < -15) type = "LATE_AND_EARLY";
                        else if (checkInMinutes > 15) type = "LATE";
                        else if (checkOutMinutes < -15) type = "EARLY_LEAVE";
                        const meta = {
                            ipAddress: faker.internet.ipv4(),
                            deviceId: faker.string.uuid(),
                            latitude: faker.location.latitude(),
                            longitude: faker.location.longitude(),
                            attendanceWith: "SCAN_QR",
                            distance: Math.round(Math.random() * 10),
                            attendanceAt: date,
                        }
                        attendances.push({
                            date: date,
                            status: "APPROVED",
                            type: type,
                            checkInAt: checkInTime,
                            checkOutAt: checkOutTime,
                            userId: user.id,
                            jobId: jobId,
                            checkInMeta: { ...meta, attendanceAt: checkInTime },
                            checkOutMeta: { ...meta, attendanceAt: checkOutTime },
                        });

                        // OT ngày thường (5% chance)
                        if (Math.random() < 0.05) {
                            const otMinutes = faker.helpers.arrayElement([60, 90, 120, 150, 180]);
                            overtimes.push({
                                userId: user.id,
                                jobId: jobId,
                                date: date,
                                startTime: new Date(Date.UTC(startYear, m - 1, d, endHour, 30, 0)),
                                endTime: new Date(Date.UTC(startYear, m - 1, d, endHour, 30 + otMinutes, 0)),
                                minutes: otMinutes,
                                reason: faker.helpers.arrayElement(["OT dự án", "Deadline gấp", "Fix bug production", "Xử lý báo cáo", "Triển khai hệ thống"]),
                                status: faker.helpers.arrayElement(["APPROVED", "APPROVED", "APPROVED", "PENDING"]),
                            });
                        }
                    }
                }
            }
        }
        console.log(`Đã tạo dữ liệu nháp tháng ${m}...`);
    }

    // Chunk insert
    const chunkSize = 5000;
    console.log(`Đang lưu ${attendances.length} bản ghi chấm công...`);
    for (let i = 0; i < attendances.length; i += chunkSize) {
        await prisma.attendance.createMany({ data: attendances.slice(i, i + chunkSize) });
    }

    console.log(`Đang lưu ${overtimes.length} bản ghi OT...`);
    for (let i = 0; i < overtimes.length; i += chunkSize) {
        await prisma.overtimeRequest.createMany({ data: overtimes.slice(i, i + chunkSize) });
    }

    console.log(`Đang lưu ${leaves.length} bản ghi nghỉ phép...`);
    for (let i = 0; i < leaves.length; i += chunkSize) {
        await prisma.leaveRequest.createMany({ data: leaves.slice(i, i + chunkSize) });
    }

    console.log(`Hoàn tất! Chấm công: ${attendances.length}, OT: ${overtimes.length}, Nghỉ phép: ${leaves.length}`);
}

const jobs = await createJobs();
const managers = await createManagers(jobs, positions);
await createJobManagers(managers, jobs);
const userJobMap = await createUserJoinedJobs(users, managers, jobs);
const allUsers = [...users, ...managers];
await createAttendanceAndRequests(allUsers, jobs, userJobMap);