import prisma from '../configs/prismaClient.js'
import { getCache, setCache, invalidateCache, CACHE_KEYS, CACHE_TTL } from '../utils/redisCache.js'
import { createAuditLog } from '../utils/auditLog.js'

/**
 * Lấy holidays theo khoảng thời gian (cached)
 */
const getHolidays = async (startDate, endDate, select = {}) => {
    const cacheKey = CACHE_KEYS.HOLIDAYS(startDate || 'all', endDate || 'all')

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const where = {}
    if (startDate) where.startDate = { gte: new Date(startDate) }
    if (endDate) where.endDate = { lte: new Date(endDate) }

    const holidays = await prisma.holiday.findMany({
        where,
        orderBy: { startDate: 'asc' },
        ...select,
    })

    await setCache(cacheKey, holidays, CACHE_TTL.HOLIDAYS)
    return holidays
}

/**
 * Tạo holiday mới (admin)
 */
const createHoliday = async (input, adminId) => {
    const holiday = await prisma.holiday.create({
        data: {
            name: input.name,
            type: input.type || 'OTHER',
            description: input.description,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            isPaid: input.isPaid || false,
        },
    })

    await invalidateCache('holidays:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'CREATE_HOLIDAY',
        resource: 'Holiday',
        resourceId: holiday.id,
        newValue: holiday,
        status: 'SUCCESS',
    })

    return holiday
}

/**
 * Cập nhật holiday (admin)
 */
const updateHoliday = async (id, input, adminId) => {
    const oldHoliday = await prisma.holiday.findUnique({ where: { id } })
    if (!oldHoliday) throw new Error('Ngày nghỉ không tồn tại')

    const holiday = await prisma.holiday.update({
        where: { id },
        data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.type !== undefined && { type: input.type }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
            ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
            ...(input.isPaid !== undefined && { isPaid: input.isPaid }),
        },
    })

    await invalidateCache('holidays:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'UPDATE_HOLIDAY',
        resource: 'Holiday',
        resourceId: id,
        oldValue: oldHoliday,
        newValue: holiday,
        status: 'SUCCESS',
    })

    return holiday
}

/**
 * Xóa holiday (admin)
 */
const deleteHoliday = async (id, adminId) => {
    const holiday = await prisma.holiday.findUnique({ where: { id } })
    if (!holiday) throw new Error('Ngày nghỉ không tồn tại')

    await prisma.holiday.delete({ where: { id } })

    await invalidateCache('holidays:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'DELETE_HOLIDAY',
        resource: 'Holiday',
        resourceId: id,
        oldValue: holiday,
        status: 'SUCCESS',
    })

    return holiday
}

export default {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
}
