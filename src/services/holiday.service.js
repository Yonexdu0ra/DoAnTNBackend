// ═══════════════════════════════════════════
//  Holiday Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const HOLIDAY_FILTER_OPTIONS = {
    keywordFields: ['name', 'description'],
    inFieldMap: {
        typeIn: 'type',
    },
}

// ── Query ──

/**
 * Lấy lịch nghỉ theo ID.
 */
const getHolidayById = async (id, select) => {
    if (!id) throw new Error('Thiếu ID ngày nghỉ')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const holiday = await prisma.holiday.findUnique(findArgs)

    if (!holiday) {
        throw new Error('Không tìm thấy ngày nghỉ')
    }

    return holiday
}

/**
 * Lấy danh sách ngày nghỉ theo khoảng thời gian (không phân trang).
 */
const getHolidays = async (startDate, endDate, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, HOLIDAY_FILTER_OPTIONS)

    const where = { ...filterWhere }
    if (startDate || endDate) {
        where.startDate = {}
        if (startDate) where.startDate.gte = new Date(startDate)
        if (endDate) where.startDate.lte = new Date(endDate)
    }

    const findArgs = {
        where,
        orderBy: { startDate: 'asc' },
    }
    if (select) findArgs.select = select

    const items = await prisma.holiday.findMany(findArgs)

    return {
        nodes: items,
        pageInfo: {
            page: 1,
            limit: items.length,
            total: items.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        },
    }
}

/**
 * Lấy danh sách ngày nghỉ có phân trang cho admin quản lý.
 */
const getHolidaysAdmin = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, HOLIDAY_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.holiday.findMany(findArgs),
        prisma.holiday.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Tạo mới ngày nghỉ.
 */
const createHoliday = async (input) => {
    const { name, type, userId, description, startDate, endDate, isPaid } = input || {}

    if (!name?.trim()) throw new Error('Thiếu tên ngày nghỉ')
    if (!type) throw new Error('Thiếu loại ngày nghỉ')
    if (!startDate || !endDate) throw new Error('Thiếu thời gian bắt đầu và kết thúc')

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
        throw new Error('Thời gian kết thúc không được trước thời gian bắt đầu')
    }

    return prisma.holiday.create({
        data: {
            name: name.trim(),
            type,
            userId: userId || null,
            description: description?.trim() || null,
            startDate: start,
            endDate: end,
            isPaid: isPaid ?? false,
        },
    })
}

/**
 * Cập nhật thông tin ngày nghỉ.
 */
const updateHoliday = async (input) => {
    const { holidayId, data } = input || {}

    if (!holidayId) throw new Error('Thiếu ID ngày nghỉ')

    const existing = await prisma.holiday.findUnique({ where: { id: holidayId } })
    if (!existing) throw new Error('Không tìm thấy ngày nghỉ')

    const updateData = {}
    if (data?.name !== undefined) {
        if (!data.name.trim()) throw new Error('Tên ngày nghỉ không được để trống')
        updateData.name = data.name.trim()
    }
    if (data?.type !== undefined) updateData.type = data.type
    if (data?.userId !== undefined) updateData.userId = data.userId || null
    if (data?.description !== undefined) updateData.description = data.description?.trim() || null
    if (data?.isPaid !== undefined) updateData.isPaid = data.isPaid

    if (data?.startDate !== undefined || data?.endDate !== undefined) {
        const start = data.startDate ? new Date(data.startDate) : existing.startDate
        const end = data.endDate ? new Date(data.endDate) : existing.endDate

        if (start > end) {
            throw new Error('Thời gian kết thúc không được trước thời gian bắt đầu')
        }
        updateData.startDate = start
        updateData.endDate = end
    }

    return prisma.holiday.update({
        where: { id: holidayId },
        data: updateData,
    })
}

/**
 * Xóa ngày nghỉ.
 */
const deleteHoliday = async (input) => {
    const { holidayId } = input || {}

    if (!holidayId) throw new Error('Thiếu ID ngày nghỉ')

    const existing = await prisma.holiday.findUnique({ where: { id: holidayId } })
    if (!existing) throw new Error('Không tìm thấy ngày nghỉ')

    await prisma.holiday.delete({
        where: { id: holidayId },
    })

    return true
}

export default {
    getHolidayById,
    getHolidays,
    getHolidaysAdmin,
    createHoliday,
    updateHoliday,
    deleteHoliday,
}
