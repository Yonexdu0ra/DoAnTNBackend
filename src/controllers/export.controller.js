import { exportJobDataToExcel } from '../services/export.service.js';

export const exportJobReport = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { fromDate, toDate, type } = req.query; // type: 'ALL', 'ATTENDANCE', 'OVERTIME', 'LEAVE_REQUEST'
        const userId = req.user.id; // Lấy từ auth middleware

        if (!jobId) {
            return res.status(400).json({ success: false, message: 'Thiếu jobId.' });
        }
        
        let exportType = type ? type.toUpperCase() : 'ALL';
        const allowedTypes = ['ALL', 'ATTENDANCE', 'OVERTIME', 'LEAVE_REQUEST'];
        if (!allowedTypes.includes(exportType)) {
            exportType = 'ALL';
        }

        const { buffer, jobName, exportPrefix } = await exportJobDataToExcel(jobId, fromDate, toDate, userId, exportType);

        // Đặt header để tải file
        const fileName = `${exportPrefix}_${jobName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        return res.send(buffer);
    } catch (error) {
        console.error('Lỗi khi xuất excel:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
