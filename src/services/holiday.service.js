import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'

const KEYWORD_FIELDS = ['name', 'description']
const IN_FIELD_MAP = { typeIn: 'type' }

// ── Query: lấy holidays theo khoảng thời gian (common) ──
const getHolidays = async (startDate, endDate, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const where = { ...filterWhere }

    if (startDate || endDate) {
        where.AND = []
        if (startDate) {
            where.AND.push({ endDate: { gte: new Date(startDate) } })
        }
        if (endDate) {
            where.AND.push({ startDate: { lte: new Date(endDate) } })
        }
    }

    const data = await prisma.holiday.findMany({
        where,
        ...(select ? { select } : {}),
        orderBy: { startDate: 'asc' },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách ngày nghỉ thành công',
        data,
        pagination: {
            page: 1,
            limit: data.length,
            total: data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        },
    }
}

// ── Query: danh sách holidays (admin, page-based) ──
const getHolidaysAdmin = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, filterWhere)

    const [data, total] = await Promise.all([
        prisma.holiday.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.holiday.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách ngày nghỉ thành công',
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    }
}

// ── Mutation: tạo holiday (admin) ──
const createHoliday = async (input, userId) => {
    const holiday = await prisma.holiday.create({
        data: {
            name: input.name,
            type: input.type,
            description: input.description || null,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            isPaid: input.isPaid ?? false,
        },
    })

    await createAuditLog({
        userId,
        action: 'CREATE_HOLIDAY',
        resource: 'Holiday',
        resourceId: holiday.id,
        newValue: holiday,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo ngày nghỉ thành công',
        data: holiday,
    }
}

// ── Mutation: cập nhật holiday (admin) ──
const updateHoliday = async (input, userId) => {
    const existing = await prisma.holiday.findUnique({
        where: { id: input.holidayId },
    })
    if (!existing) throw new Error('Ngày nghỉ không tồn tại')

    const updateData = {}
    const payload = input.data
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.type !== undefined) updateData.type = payload.type
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.startDate !== undefined) updateData.startDate = new Date(payload.startDate)
    if (payload.endDate !== undefined) updateData.endDate = new Date(payload.endDate)
    if (payload.isPaid !== undefined) updateData.isPaid = payload.isPaid

    const updated = await prisma.holiday.update({
        where: { id: input.holidayId },
        data: updateData,
    })

    await createAuditLog({
        userId,
        action: 'UPDATE_HOLIDAY',
        resource: 'Holiday',
        resourceId: updated.id,
        oldValue: existing,
        newValue: updated,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật ngày nghỉ thành công',
        data: updated,
    }
}

// ── Mutation: xoá holiday (admin) ──
const deleteHoliday = async (input, userId) => {
    const existing = await prisma.holiday.findUnique({
        where: { id: input.holidayId },
    })
    if (!existing) throw new Error('Ngày nghỉ không tồn tại')

    await prisma.holiday.delete({ where: { id: input.holidayId } })

    await createAuditLog({
        userId,
        action: 'DELETE_HOLIDAY',
        resource: 'Holiday',
        resourceId: input.holidayId,
        oldValue: existing,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá ngày nghỉ thành công',
    }
}

export default {
    getHolidays,
    getHolidaysAdmin,
    createHoliday,
    updateHoliday,
    deleteHoliday,
}
