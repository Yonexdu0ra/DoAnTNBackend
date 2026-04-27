import { Router } from 'express'
import { requireToken } from '../../middlewares/auth.middleware.js'
const router = Router()
router.get('/', requireToken, (req, res) => {
    try {
        const { role } = req?.user;
        const adminSidebar = [
            {
                label: "Bảng điều khiển",
                href: "/admin/dashboard",
            },
            {
                label: "Quản lý người dùng",
                href: "/admin/user",
            },
            {
                label: "Quản lý công việc",
                href: "/admin/job",
            },
            {
                label: "Quản lý lịch nghỉ",
                href: "/admin/holiday",
            },
            {
                label: "Quản lý phòng ban",
                href: "/admin/department",
            },
            {
                label: "Quản lý chức vụ",
                href: "/admin/position",
            },
            {
                label: "Quản lý nhật ký",
                href: "/admin/audit-log",
            },
            {
                label: "Cấu hình hệ thống",
                href: "/admin/configs",
            },
            {
                label: "Quản lý tài liệu",
                href: "/admin/document",
            }
        ]
        const managerSidebar = [
            {
                label: "Bảng điều khiển",
                href: "/manager/dashboard",
            },
            {
                label: "Quản lý công việc",
                href: "/manager/job",
            },
        ]

        return res.status(200).json({
            success: true,
            message: "Lấy sidebar thành công",
            data: role === 'ADMIN' ? adminSidebar : role === "MANAGER" ? managerSidebar : [],
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
            data: [],
            success: false
        })
    }
})
export default router