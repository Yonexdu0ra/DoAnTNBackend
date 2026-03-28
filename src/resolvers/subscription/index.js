import { ensureAuthorized, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import { pubsub, EVENTS } from '../../configs/pubsub.js'

const commonSubscriptions = {
	notificationReviced: {
		subscribe: async (_parent, _args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.common, 'Subscription notificationReviced')
			const userId = context.user?.id
			// Filter notification chỉ cho user hiện tại
			return pubsub.asyncIterableIterator(EVENTS.NOTIFICATION_RECEIVED)
		},
		resolve: (payload, _args, context) => {
			// Chỉ gửi notification cho user được chỉ định
			if (payload?.userId && payload.userId !== context.user?.id) return null
			return payload
		},
	},
}

const managerSubscriptions = {
	newReviewLeaveRequestByJob: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.manager, 'Subscription newReviewLeaveRequestByJob')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.NEW_LEAVE_REQUEST_BY_JOB(jobId))
		},
		resolve: (payload) => payload,
	},
	newReviewOvertimeRequestByJob: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.manager, 'Subscription newReviewOvertimeRequestByJob')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(jobId))
		},
		resolve: (payload) => payload,
	},
	newReviewAttendanceByJob: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.manager, 'Subscription newReviewAttendanceByJob')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.NEW_ATTENDANCE_BY_JOB(jobId))
		},
		resolve: (payload) => payload,
	},
	employeeManageredInJobUpdated: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.manager, 'Subscription employeeManageredInJobUpdated')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId))
		},
		resolve: (payload) => payload,
	},
	jobManagerUpdated: {
		subscribe: async (_parent, _args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.manager, 'Subscription jobManagerUpdated')
			return pubsub.asyncIterableIterator(EVENTS.JOB_MANAGER_UPDATED)
		},
		resolve: (payload) => payload,
	},
}

const employeeSubscriptions = {
	leaveRequestUpdated: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.employee, 'Subscription leaveRequestUpdated')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.LEAVE_REQUEST_UPDATED(jobId))
		},
		resolve: (payload, _args, context) => {
			// Chỉ gửi cho employee sở hữu đơn
			if (payload?.userId && payload.userId !== context.user?.id) return null
			return payload
		},
	},
	overtimeRequestUpdated: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.employee, 'Subscription overtimeRequestUpdated')
			const { jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.OVERTIME_REQUEST_UPDATED(jobId))
		},
		resolve: (payload, _args, context) => {
			if (payload?.userId && payload.userId !== context.user?.id) return null
			return payload
		},
	},
	attendanceUpdated: {
		subscribe: async (_parent, args, context) => {
			ensureAuthorized(context, ROLE_ACCESS.employee, 'Subscription attendanceUpdated')
			const { userId, jobId } = args
			return pubsub.asyncIterableIterator(EVENTS.ATTENDANCE_UPDATED(userId, jobId))
		},
		resolve: (payload) => payload,
	},
}

const subscriptionResolvers = {
	...commonSubscriptions,
	...managerSubscriptions,
	...employeeSubscriptions,
}

export default subscriptionResolvers
