import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import jobService from '../../services/job.service.js'
import attendanceService from '../../services/attendance.service.js'

const managerMutations = {
    reviewLeaveRequest: withAuthorization('reviewLeaveRequest', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const { id, status, reply } = args.input
            const data = await leaveRequestService.reviewLeaveRequest(id, status, reply, context.user.id)
            return { success: true, message: `Đơn xin nghỉ đã được ${status === 'APPROVED' ? 'duyệt' : 'từ chối'}`, data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    reviewOvertimeRequest: withAuthorization('reviewOvertimeRequest', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const { id, status, reply } = args.input
            const data = await overtimeRequestService.reviewOvertimeRequest(id, status, reply, context.user.id)
            return { success: true, message: `Đơn xin làm thêm đã được ${status === 'APPROVED' ? 'duyệt' : 'từ chối'}`, data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    manageEmployeeInJob: withAuthorization('manageEmployeeInJob', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const { jobId, employeeIds } = args.input
            const result = await jobService.manageEmployeeInJob(context.user.id, jobId, employeeIds)
            return { success: true, message: `Cập nhật nhân viên thành công. Thêm: ${result.added}, Xóa: ${result.removed}`, data: result.job }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    reviewFraudAttendance: withAuthorization('reviewFraudAttendance', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const data = await attendanceService.reviewFraudAttendance(context.user.id, args.input)
            return { success: true, message: args.input.isFraud ? 'Đã đánh dấu gian lận' : 'Đã xác nhận không gian lận', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    createManualAttendance: withAuthorization('createManualAttendance', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const data = await attendanceService.createManualAttendance(context.user.id, args.input)
            return { success: true, message: 'Tạo bản ghi chấm công thủ công thành công', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    createManualLeaveRequest: withAuthorization('createManualLeaveRequest', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const data = await leaveRequestService.createManualLeaveRequest(context.user.id, args.input)
            return { success: true, message: 'Tạo đơn xin nghỉ thủ công thành công', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    createManualOvertimeRequest: withAuthorization('createManualOvertimeRequest', ROLE_ACCESS.manager, async (_parent, args, context) => {
        try {
            const data = await overtimeRequestService.createManualOvertimeRequest(context.user.id, args.input)
            return { success: true, message: 'Tạo đơn xin làm thêm thủ công thành công', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),
}

export default managerMutations
