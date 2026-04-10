import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'

const KEYWORD_FIELDS = ['name', 'description']

// ── Query: danh sách phòng ban (admin) ──
const getDepartments = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })
    const args = buildPagePaginationArgs(pagination, orderBy, null, filterWhere)

    const [data, total] = await Promise.all([
        prisma.department.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.department.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách phòng ban thành công',
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

// ── Mutation: tạo phòng ban ──
const createDepartment = async (input, userId) => {
    const department = await prisma.department.create({
        data: {
            name: input.name,
            description: input.description || null,
        },
    })

    await createAuditLog({
        userId,
        action: 'CREATE_DEPARTMENT',
        resource: 'Department',
        resourceId: department.id,
        newValue: department,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo phòng ban thành công',
        data: department,
    }
}

// ── Mutation: cập nhật phòng ban ──
const updateDepartment = async (input, userId) => {
    const existing = await prisma.department.findUnique({
        where: { id: input.departmentId },
    })
    if (!existing) throw new Error('Phòng ban không tồn tại')

    const updated = await prisma.department.update({
        where: { id: input.departmentId },
        data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
        },
    })

    await createAuditLog({
        userId,
        action: 'UPDATE_DEPARTMENT',
        resource: 'Department',
        resourceId: updated.id,
        oldValue: existing,
        newValue: updated,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật phòng ban thành công',
        data: updated,
    }
}

// ── Mutation: xoá phòng ban ──
const deleteDepartment = async (input, userId) => {
    const existing = await prisma.department.findUnique({
        where: { id: input.departmentId },
    })
    if (!existing) throw new Error('Phòng ban không tồn tại')

    await prisma.department.delete({ where: { id: input.departmentId } })

    await createAuditLog({
        userId,
        action: 'DELETE_DEPARTMENT',
        resource: 'Department',
        resourceId: input.departmentId,
        oldValue: existing,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá phòng ban thành công',
    }
}

export default {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
}
