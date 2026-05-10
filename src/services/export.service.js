import ExcelJS from 'exceljs';
import prisma from '../configs/prismaClient.js';
import { startOfDay, endOfDay, format } from 'date-fns';

export const exportJobDataToExcel = async (jobId, fromDate, toDate, userId, exportType = 'ALL') => {
    // Gọi prisma kiểm tra
    // 1. Kiểm tra Job & Manager/Admin role
    const job = await prisma.job.findUnique({
        where: { id: jobId }
    });

    if (!job) {
        throw new Error('Không tìm thấy công việc (Job).');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (user?.role !== 'ADMIN') {
        const isManager = await prisma.jobManager.findFirst({
            where: { jobId, userId }
        });
        if (!isManager) {
            throw new Error('Bạn không có quyền xuất dữ liệu cho công việc này.');
        }
    }

    // Thiết lập bộ lọc thời gian
    const dateCondition = {};
    if (fromDate && toDate) {
        dateCondition.gte = startOfDay(new Date(fromDate));
        dateCondition.lte = endOfDay(new Date(toDate));
    }

    const whereCondition = { jobId };
    if (dateCondition.gte) {
        whereCondition.date = dateCondition;
    }

    const leaveWhereCondition = { jobId };
    if (dateCondition.gte) {
        leaveWhereCondition.startDate = { lte: dateCondition.lte };
        leaveWhereCondition.endDate = { gte: dateCondition.gte };
    }

    // Kéo dữ liệu từ 3 bảng

    // Tạo Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Quản lý';
    workbook.created = new Date();

    // -------------- SHEET 1: ĐIỂM DANH --------------
    if (exportType === 'ALL' || exportType === 'ATTENDANCE') {
        const attendances = await prisma.attendance.findMany({
            where: whereCondition,
            include: { user: { include: { profile: true } } },
            orderBy: { date: 'asc' }
        });

        const attendanceSheet = workbook.addWorksheet('Điểm danh', { views: [{ state: 'frozen', ySplit: 1 }] });
        attendanceSheet.columns = [
            { header: 'Mã NV', key: 'code', width: 15 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Ngày', key: 'date', width: 15 },
            { header: 'Loại', key: 'type', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Giờ Check-in', key: 'checkInAt', width: 20 },
            { header: 'Giờ Check-out', key: 'checkOutAt', width: 20 },
            { header: 'Nghi vấn', key: 'isFraud', width: 12 }, // Gian lận
        ];
        
        // Formatting Header
        attendanceSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        attendanceSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

        attendances.forEach(att => {
            attendanceSheet.addRow({
                code: att.user?.code || '',
                fullName: att.user?.profile?.fullName || '',
                email: att.user?.email || '',
                date: format(att.date, 'yyyy-MM-dd'),
                type: att.type,
                status: att.status,
                checkInAt: att.checkInAt ? format(att.checkInAt, 'HH:mm:ss dd/MM/yyyy') : '',
                checkOutAt: att.checkOutAt ? format(att.checkOutAt, 'HH:mm:ss dd/MM/yyyy') : '',
                isFraud: att.isFraud ? 'Có' : 'Không'
            });
        });
    }

    // -------------- SHEET 2: LÀM THÊM GIỜ --------------
    if (exportType === 'ALL' || exportType === 'OVERTIME') {
        const overtimes = await prisma.overtimeRequest.findMany({
            where: whereCondition,
            include: { user: { include: { profile: true } } },
            orderBy: { date: 'asc' }
        });

        const overtimeSheet = workbook.addWorksheet('Làm thêm giờ', { views: [{ state: 'frozen', ySplit: 1 }] });
        overtimeSheet.columns = [
            { header: 'Mã NV', key: 'code', width: 15 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Ngày', key: 'date', width: 15 },
            { header: 'Bắt đầu', key: 'startTime', width: 20 },
            { header: 'Kết thúc', key: 'endTime', width: 20 },
            { header: 'Số phút', key: 'minutes', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Lý do', key: 'reason', width: 30 },
        ];

        overtimeSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        overtimeSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BBB59' } };

        overtimes.forEach(ot => {
            overtimeSheet.addRow({
                code: ot.user?.code || '',
                fullName: ot.user?.profile?.fullName || '',
                email: ot.user?.email || '',
                date: format(ot.date, 'yyyy-MM-dd'),
                startTime: format(ot.startTime, 'HH:mm:ss'),
                endTime: format(ot.endTime, 'HH:mm:ss'),
                minutes: ot.minutes,
                status: ot.status,
                reason: ot.reason || ''
            });
        });
    }

    // -------------- SHEET 3: NGHỈ PHÉP --------------
    if (exportType === 'ALL' || exportType === 'LEAVE_REQUEST') {
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: leaveWhereCondition,
            include: { user: { include: { profile: true } } },
            orderBy: { startDate: 'asc' }
        });

        const leaveSheet = workbook.addWorksheet('Nghỉ phép', { views: [{ state: 'frozen', ySplit: 1 }] });
        leaveSheet.columns = [
            { header: 'Mã NV', key: 'code', width: 15 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Bắt đầu', key: 'startDate', width: 20 },
            { header: 'Kết thúc', key: 'endDate', width: 20 },
            { header: 'Loại nghỉ', key: 'leaveType', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Lý do', key: 'reason', width: 30 },
        ];

        leaveSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        leaveSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF79646' } };

        leaveRequests.forEach(lr => {
            leaveSheet.addRow({
                code: lr.user?.code || '',
                fullName: lr.user?.profile?.fullName || '',
                email: lr.user?.email || '',
                startDate: format(lr.startDate, 'yyyy-MM-dd'),
                endDate: format(lr.endDate, 'yyyy-MM-dd'),
                leaveType: lr.leaveType,
                status: lr.status,
                reason: lr.reason || ''
            });
        });
    }

    // Kiểm tra xem workbook có sheet nào không
    if (workbook.worksheets.length === 0) {
        throw new Error('Dữ liệu yêu cầu xuất không hợp lệ (không có loại báo cáo nào được chỉ định).');
    }

    const buffer = await workbook.xlsx.writeBuffer();

    let exportPrefix = 'Report';
    if (exportType === 'ATTENDANCE') exportPrefix = 'Attendance';
    if (exportType === 'OVERTIME') exportPrefix = 'Overtime';
    if (exportType === 'LEAVE_REQUEST') exportPrefix = 'LeaveRequest';

    return { buffer, jobName: job.title, exportPrefix };
};
