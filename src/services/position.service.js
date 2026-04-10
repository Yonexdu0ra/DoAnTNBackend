import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'

const KEYWORD_FIELDS = ['name', 'description']

// ── Query: danh sách vị trí (admin) ──
const getPositions = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, { keywordFields: KEYWORD_FIELDS })
    const args = buildPagePaginationArgs(pagination, orderBy, null, filterWhere)

    const [data, total] = await Promise.all([
        prisma.position.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.position.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách vị trí thành công',
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

// ── Mutation: tạo vị trí ──
const createPosition = async (input, userId) => {
    const position = await prisma.position.create({
        data: {
            name: input.name,
            description: input.description || null,
            departmentId: input.departmentId || null,
        },
        include: { department: true },
    })

    await createAuditLog({
        userId,
        action: 'CREATE_POSITION',
        resource: 'Position',
        resourceId: position.id,
        newValue: position,
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo vị trí thành công',
        data: position,
    }
}

// ── Mutation: cập nhật vị trí ──
const updatePosition = async (input, userId) => {
    const existing = await prisma.position.findUnique({
        where: { id: input.positionId },
    })
    if (!existing) throw new Error('Vị trí không tồn tại')

    const updated = await prisma.position.update({
        where: { id: input.positionId },
        data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
        },
        include: { department: true },
    })

    await createAuditLog({
        userId,
        action: 'UPDATE_POSITION',
        resource: 'Position',
        resourceId: updated.id,
        oldValue: existing,
        newValue: updated,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật vị trí thành công',
        data: updated,
    }
}

// ── Mutation: xoá vị trí ──
const deletePosition = async (input, userId) => {
    const existing = await prisma.position.findUnique({
        where: { id: input.positionId },
    })
    if (!existing) throw new Error('Vị trí không tồn tại')

    await prisma.position.delete({ where: { id: input.positionId } })

    await createAuditLog({
        userId,
        action: 'DELETE_POSITION',
        resource: 'Position',
        resourceId: input.positionId,
        oldValue: existing,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá vị trí thành công',
    }
}

export default {
    getPositions,
    createPosition,
    updatePosition,
    deletePosition,
}
