import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import jobService from '../../services/job.service.js'
import holidayService from '../../services/holiday.service.js'
import userService from '../../services/user.service.js'

const adminMutations = {
    createJob: withAuthorization('createJob', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const job = await jobService.createJob(args.input, context.user.id)
            return { success: true, message: 'Tạo công việc thành công', data: job }
        } catch (error) {
            return { success: false, message: `Tạo công việc thất bại: ${error.message}`, data: null }
        }
    }),

    updateJob: withAuthorization('updateJob', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const job = await jobService.updateJob(args.id, args.input, context.user.id)
            return { success: true, message: 'Cập nhật công việc thành công', data: job }
        } catch (error) {
            return { success: false, message: `Cập nhật thất bại: ${error.message}`, data: null }
        }
    }),

    deleteJob: withAuthorization('deleteJob', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const job = await jobService.deleteJob(args.id, context.user.id)
            return { success: true, message: 'Xóa công việc thành công', data: job }
        } catch (error) {
            return { success: false, message: `Xóa thất bại: ${error.message}`, data: null }
        }
    }),

    createHoliday: withAuthorization('createHoliday', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const holiday = await holidayService.createHoliday(args.input, context.user.id)
            return { success: true, message: 'Tạo ngày nghỉ thành công', data: holiday }
        } catch (error) {
            return { success: false, message: `Tạo ngày nghỉ thất bại: ${error.message}`, data: null }
        }
    }),

    updateHoliday: withAuthorization('updateHoliday', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const holiday = await holidayService.updateHoliday(args.id, args.input, context.user.id)
            return { success: true, message: 'Cập nhật ngày nghỉ thành công', data: holiday }
        } catch (error) {
            return { success: false, message: `Cập nhật thất bại: ${error.message}`, data: null }
        }
    }),

    deleteHoliday: withAuthorization('deleteHoliday', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const holiday = await holidayService.deleteHoliday(args.id, context.user.id)
            return { success: true, message: 'Xóa ngày nghỉ thành công', data: holiday }
        } catch (error) {
            return { success: false, message: `Xóa thất bại: ${error.message}`, data: null }
        }
    }),

    createUser: withAuthorization('createUser', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const result = await userService.createUser(args.input, context.user.id)
            return { success: true, message: `Tạo tài khoản thành công. Mã nhân viên: ${result.code}. Mật khẩu mặc định: ${result.defaultPassword}`, data: result.user }
        } catch (error) {
            return { success: false, message: `Tạo tài khoản thất bại: ${error.message}`, data: null }
        }
    }),

    updateUser: withAuthorization('updateUser', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const user = await userService.updateUser(args.id, args.input, context.user.id)
            return { success: true, message: 'Cập nhật tài khoản thành công', data: user }
        } catch (error) {
            return { success: false, message: `Cập nhật thất bại: ${error.message}`, data: null }
        }
    }),

    resetPassword: withAuthorization('resetPassword', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const result = await userService.resetPassword(args.id, context.user.id)
            return { success: true, message: `Đặt lại mật khẩu thành công. Mật khẩu mới: ${result.defaultPassword}`, data: result.user }
        } catch (error) {
            return { success: false, message: `Đặt lại mật khẩu thất bại: ${error.message}`, data: null }
        }
    }),

    toggleUserStatus: withAuthorization('toggleUserStatus', ROLE_ACCESS.admin, async (_parent, args, context) => {
        try {
            const result = await userService.toggleUserStatus(args.id, context.user.id)
            return { success: true, message: result.isLocked ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công', data: result.user }
        } catch (error) {
            return { success: false, message: `Thao tác thất bại: ${error.message}`, data: null }
        }
    }),
}

export default adminMutations
