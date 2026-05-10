import { pubsub, EVENTS } from '../../configs/pubsub.js'
import { ensureAuthorized, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import { encryptAES } from '../../utils/aes.js'
import prisma from '../../configs/prismaClient.js'

const QR_ROTATE_INTERVAL_MS = Number(process.env.QR_ROTATE_INTERVAL_MS || 5000)
const QR_EXPIRE_AFTER_MS = Number(process.env.QR_EXPIRE_AFTER_MS || 10000)
const qrTickerMap = new Map()
const qrSubscriberCountMap = new Map()

const getQRScanType = (job, now) => {
  if (!job) return 'UNKNOWN'

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const workStart = new Date(job.workStartTime)
  const startMinutes = workStart.getHours() * 60 + workStart.getMinutes()

  const workEnd = new Date(job.workEndTime)
  const endMinutes = workEnd.getHours() * 60 + workEnd.getMinutes()

  let adjustedNow = nowMinutes
  let adjustedEnd = endMinutes
  if (endMinutes < startMinutes) {
    adjustedEnd += 24 * 60
    if (nowMinutes < startMinutes) {
      adjustedNow += 24 * 60
    }
  }

  const earlyCheckIn = job.earlyCheckInMinutes || 60
  const lateCheckOut = job.lateCheckOutMinutes || 60

  const startWindow = startMinutes - earlyCheckIn
  const endWindow = adjustedEnd + lateCheckOut

  if (adjustedNow < startWindow || adjustedNow > endWindow) {
    return 'UNKNOWN'
  }

  const midpoint = startMinutes + (adjustedEnd - startMinutes) / 2

  if (adjustedNow <= midpoint) {
    return 'CHECKIN'
  } else {
    return 'CHECKOUT'
  }
}

const buildQRCodePayload = async (jobId) => {
  const now = new Date()
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  const type = getQRScanType(job, now)

  const timeBase = new Date(now.getTime() + QR_ROTATE_INTERVAL_MS)
  const expireAt = new Date(now.getTime() + QR_EXPIRE_AFTER_MS)
  const qrCodeData = encryptAES(JSON.stringify({
    jobId,
    timeBase: timeBase.toISOString(),
    expireAt: expireAt.toISOString(),
    type,
  }))

  return {
    expireAt,
    timeBase,
    qrCodeData,
    type,
  }
}

const publishQRCodeUpdate = async (jobId) => {
  const payload = await buildQRCodePayload(jobId)
  pubsub.publish(EVENTS.ATTENDANCE_QR_CODE_BY_JOB(jobId), {
    managerReceivedAttendanceQRCodeJob: payload,
  })
}

const increaseQRSubscriber = (jobId) => {
  const count = qrSubscriberCountMap.get(jobId) || 0
  qrSubscriberCountMap.set(jobId, count + 1)
}

const decreaseQRSubscriber = (jobId) => {
  const count = qrSubscriberCountMap.get(jobId) || 0
  if (count <= 1) {
    qrSubscriberCountMap.delete(jobId)
    const timer = qrTickerMap.get(jobId)
    if (timer) {
      clearInterval(timer)
      qrTickerMap.delete(jobId)
    }
    return
  }

  qrSubscriberCountMap.set(jobId, count - 1)
}

const startQRTicker = (jobId) => {
  if (qrTickerMap.has(jobId)) return

  const timer = setInterval(() => {
    publishQRCodeUpdate(jobId)
  }, QR_ROTATE_INTERVAL_MS)

  qrTickerMap.set(jobId, timer)
}

const withUnsubscribeCleanup = (iterator, onCleanup) => {
  const originalReturn = iterator.return?.bind(iterator)
  const originalThrow = iterator.throw?.bind(iterator)

  iterator.return = async (...args) => {
    onCleanup()
    if (originalReturn) {
      return originalReturn(...args)
    }
    return { value: undefined, done: true }
  }

  iterator.throw = async (...args) => {
    onCleanup()
    if (originalThrow) {
      return originalThrow(...args)
    }
    throw args[0]
  }

  return iterator
}

// ═══════════════════════════════════════════
//  SUBSCRIPTION CHUNG (common – tất cả role)
// ═══════════════════════════════════════════

const userReceivedNotification = {
  subscribe: (_, __, context) => {
    ensureAuthorized(context, ROLE_ACCESS.common, 'userReceivedNotification')
    const userId = context.user.id
    return pubsub.asyncIterator([`${EVENTS.NOTIFICATION_RECEIVED}:${userId}`])
  },
  resolve: (payload) => {
    const data = payload?.userReceivedNotification
    return data?.data || data
  },
}

// ═══════════════════════════════════════════
//  SUBSCRIPTION DÀNH CHO EMPLOYEE
// ═══════════════════════════════════════════

const employeeReceivedLeaveRequestStatus = {
  subscribe: (_, __, context) => {
    ensureAuthorized(context, ROLE_ACCESS.common, 'employeeReceivedLeaveRequestStatus')
    const userId = context.user.id
    return pubsub.asyncIterator([EVENTS.EMPLOYEE_LEAVE_STATUS(userId)])
  },
  resolve: (payload) => {
    const data = payload?.employeeReceivedLeaveRequestStatus
    return data?.data || data
  },
}

const employeeReceivedOvertimeRequestStatus = {
  subscribe: (_, __, context) => {
    ensureAuthorized(context, ROLE_ACCESS.common, 'employeeReceivedOvertimeRequestStatus')
    const userId = context.user.id
    return pubsub.asyncIterator([EVENTS.EMPLOYEE_OVERTIME_STATUS(userId)])
  },
  resolve: (payload) => {
    const data = payload?.employeeReceivedOvertimeRequestStatus
    return data?.data || data
  },
}

const employeeReceivedAttendanceStatus = {
  subscribe: (_, __, context) => {
    ensureAuthorized(context, ROLE_ACCESS.common, 'employeeReceivedAttendanceStatus')
    const userId = context.user.id
    return pubsub.asyncIterator([EVENTS.EMPLOYEE_ATTENDANCE_STATUS(userId)])
  },
  resolve: (payload) => {
    const data = payload?.employeeReceivedAttendanceStatus
    return data?.data || data
  },
}

// ═══════════════════════════════════════════
//  SUBSCRIPTION DÀNH CHO MANAGER
// ═══════════════════════════════════════════

const managerReceivedLeaveRequest = {
  subscribe: (_, { jobId }, context) => {
    ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedLeaveRequest')
    return pubsub.asyncIterator([EVENTS.NEW_LEAVE_REQUEST_BY_JOB(jobId)])
  },
  resolve: (payload) => {
    const data = payload?.managerReceivedLeaveRequest
    return data?.data || data
  },
}

const managerReceivedOvertimeRequest = {
  subscribe: (_, { jobId }, context) => {
    ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedOvertimeRequest')
    return pubsub.asyncIterator([EVENTS.NEW_OVERTIME_REQUEST_BY_JOB(jobId)])
  },
  resolve: (payload) => {
    const data = payload?.managerReceivedOvertimeRequest
    return data?.data || data
  },
}

const managerReceivedAttendance = {
  subscribe: (_, { jobId }, context) => {
    ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedAttendance')
    return pubsub.asyncIterator([EVENTS.NEW_ATTENDANCE_BY_JOB(jobId)])
  },
  resolve: (payload) => {
    const data = payload?.managerReceivedAttendance
    return data?.data || data
  },
}

const managerReceivedUserJoinedJob = {
  subscribe: (_, { jobId }, context) => {
    ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedUserJoinedJob')
    return pubsub.asyncIterator([EVENTS.EMPLOYEE_IN_JOB_UPDATED(jobId)])
  },
  resolve: (payload) => {
    const data = payload?.managerReceivedUserJoinedJob
    return data?.data || data
  },
}

const managerReceivedAttendanceQRCodeJob = {
  subscribe: (_, { jobId }, context) => {
    ensureAuthorized(context, ROLE_ACCESS.managerAdmin, 'managerReceivedAttendanceQRCodeJob')

    const sharedChannel = EVENTS.ATTENDANCE_QR_CODE_BY_JOB(jobId)
    const iterator = withUnsubscribeCleanup(
      pubsub.asyncIterator([sharedChannel]),
      () => {
        decreaseQRSubscriber(jobId)
      },
    )

    increaseQRSubscriber(jobId)
    startQRTicker(jobId)

    return (async function* immediateFirstQRCode() {
      // Trả QR đầu tiên trực tiếp để client nhận ngay khi subscribe thành công.
      const firstPayload = await buildQRCodePayload(jobId)
      yield {
        managerReceivedAttendanceQRCodeJob: firstPayload,
      }

      for await (const payload of iterator) {
        yield payload
      }
    })()
  },
}

// ═══════════════════════════════════════════

const subscriptionResolvers = {
  // common
  userReceivedNotification,

  // employee
  employeeReceivedLeaveRequestStatus,
  employeeReceivedOvertimeRequestStatus,
  employeeReceivedAttendanceStatus,

  // manager
  managerReceivedLeaveRequest,
  managerReceivedOvertimeRequest,
  managerReceivedAttendance,
  managerReceivedUserJoinedJob,
  managerReceivedAttendanceQRCodeJob,
}

export default subscriptionResolvers
