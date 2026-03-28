import prisma from '../configs/prismaClient.js'

/**
 * Tạo audit log record
 * @param {Object} params
 * @param {string} params.userId - ID user thực hiện hành động
 * @param {string} params.action - Hành động: CREATE_USER, UPDATE_JOB, DELETE_HOLIDAY, etc.
 * @param {string} params.resource - Đối tượng: User, Job, Holiday, etc.
 * @param {string} [params.resourceId] - ID bản ghi bị tác động
 * @param {Object} [params.oldValue] - Dữ liệu trước khi thay đổi
 * @param {Object} [params.newValue] - Dữ liệu sau khi thay đổi
 * @param {string} [params.ipAddress] - IP người thao tác
 * @param {string} [params.userAgent] - Trình duyệt / app
 * @param {string} [params.status='SUCCESS'] - Trạng thái: SUCCESS / FAIL
 */
export const createAuditLog = async ({
    userId,
    action,
    resource,
    resourceId = null,
    oldValue = null,
    newValue = null,
    ipAddress = null,
    userAgent = null,
    status = 'SUCCESS',
}) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                resource,
                resourceId,
                oldValue,
                newValue,
                ipAddress,
                userAgent,
                status,
            }
        })
    } catch (error) {
        console.error('Failed to create audit log:', error.message)
    }
}
