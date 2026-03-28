import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import attendanceService from '../../services/attendance.service.js'
import leaveRequestService from '../../services/leaveRequest.service.js'
import overtimeRequestService from '../../services/overtimeRequest.service.js'

const employeeQueries = {
    attendancesByEmployeeByTime: withAuthorization('attendancesByEmployeeByTime', ROLE_ACCESS.employee, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return attendanceService.getAttendancesByEmployeeByTime(context.user.id, args.startDate, args.endDate, select)
    }),

    attendancesByEmployees: withAuthorization('attendancesByEmployees', ROLE_ACCESS.employee, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return attendanceService.getAttendancesByEmployees(context.user.id, args.pagination, args.orderBy, args.search, select)
    }),

    leaveRequestsByEmployee: withAuthorization('leaveRequestsByEmployee', ROLE_ACCESS.employee, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return leaveRequestService.getLeaveRequestsByEmployee(context.user.id, args.pagination, args.orderBy, args.search, select)
    }),

    overtimeRequestsByEmployee: withAuthorization('overtimeRequestsByEmployee', ROLE_ACCESS.employee, async (_parent, args, context, info) => {
        const select = getSelectPrisma(info)
        return overtimeRequestService.getOvertimeRequestsByEmployee(context.user.id, args.pagination, args.orderBy, args.search, select)
    }),
}

export default employeeQueries
