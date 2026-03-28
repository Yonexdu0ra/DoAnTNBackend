import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'
import attendanceService from '../../services/attendance.service.js'

const employeeMutations = {
    createLeaveRequest: withAuthorization('createLeaveRequest', ROLE_ACCESS.employee, async (_parent, args, context) => {
        try {
            const data = await leaveRequestService.createLeaveRequest(context.user.id, args.jobId, args.input)
            return { success: true, message: 'Tạo đơn xin nghỉ thành công', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    createOvertimeRequest: withAuthorization('createOvertimeRequest', ROLE_ACCESS.employee, async (_parent, args, context) => {
        try {
            const data = await overtimeRequestService.createOvertimeRequest(context.user.id, args.jobId, args.input)
            return { success: true, message: 'Tạo đơn xin làm thêm thành công', data }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),

    createAttendance: withAuthorization('createAttendance', ROLE_ACCESS.employee, async (_parent, args, context) => {
        try {
            const result = await attendanceService.createAttendance(context.user.id, args.input)
            const message = result.isFraud
                ? `Chấm công thành công (cảnh báo: ${result.fraudReason})`
                : 'Chấm công thành công'
            return { success: true, message, data: result.attendance }
        } catch (error) {
            return { success: false, message: error.message, data: null }
        }
    }),
}

export default employeeMutations
