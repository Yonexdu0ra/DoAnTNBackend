import { RedisPubSub } from 'graphql-redis-subscriptions'
import { redisPub, redisSub } from './redisClient.js'

export const pubsub = new RedisPubSub({
    publisher: redisPub,
    subscriber: redisSub,
})

// Event name constants
export const EVENTS = {
    // Common
    NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',

    // Manager subscriptions
    NEW_LEAVE_REQUEST_BY_JOB: (jobId) => `NEW_LEAVE_REQUEST_BY_JOB:${jobId}`,
    NEW_OVERTIME_REQUEST_BY_JOB: (jobId) => `NEW_OVERTIME_REQUEST_BY_JOB:${jobId}`,
    NEW_ATTENDANCE_BY_JOB: (jobId) => `NEW_ATTENDANCE_BY_JOB:${jobId}`,
    EMPLOYEE_IN_JOB_UPDATED: (jobId) => `EMPLOYEE_IN_JOB_UPDATED:${jobId}`,
    JOB_MANAGER_UPDATED: 'JOB_MANAGER_UPDATED',

    // Employee subscriptions
    LEAVE_REQUEST_UPDATED: (jobId) => `LEAVE_REQUEST_UPDATED:${jobId}`,
    OVERTIME_REQUEST_UPDATED: (jobId) => `OVERTIME_REQUEST_UPDATED:${jobId}`,
    ATTENDANCE_UPDATED: (userId, jobId) => `ATTENDANCE_UPDATED:${userId}:${jobId}`,
}
