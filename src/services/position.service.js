// ═══════════════════════════════════════════
//  Position Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const POSITION_FILTER_OPTIONS = {
    keywordFields: ['name', 'description'],
    inFieldMap: {},
}

// ── Query ──

/**
 * Lấy chức vụ theo ID.
 * 
 * @param {string} id - position ID
 * @param {Object|null} select - Prisma select
 * @returns {Promise<PositionResponse>}
 */
const getPositionById = async (id, select) => {
    if (!id) throw new Error('Thiếu ID chức vụ')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const position = await prisma.position.findUnique(findArgs)

    if (!position) {
        throw new Error('Không tìm thấy chức vụ')
    }

    return position
}

/**
 * Lấy danh sách chức vụ.
 * 
 * @param {Object|null} pagination - { page, limit }
 * @param {Object|null} orderBy - { field, order }
 * @param {Object|null} filter - PositionFilterInput
 * @param {Object|null} select - Prisma select
 * @returns {Promise<PositionListResponse>}
 */
const getPositions = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, POSITION_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.position.findMany(findArgs),
        prisma.position.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

/**
 * Lấy danh sách chức vụ theo phòng ban.
 * 
 * @param {string} departmentId
 * @param {Object|null} pagination
 * @param {Object|null} orderBy
 * @param {Object|null} filter
 * @param {Object|null} select
 * @returns {Promise<PositionListResponse>}
 */
const getPositionsByDepartment = async (departmentId, pagination, orderBy, filter, select) => {
    if (!departmentId) throw new Error('Thiếu ID phòng ban')

    const filterWhere = buildPrismaFilter(filter, POSITION_FILTER_OPTIONS)
    const extraWhere = { ...filterWhere, departmentId }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.position.findMany(findArgs),
        prisma.position.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Tạo chức vụ mới.
 * 
 * @param {Object} input - { name, description, departmentId }
 * @returns {Promise<PositionResponse>}
 */
const createPosition = async (input) => {
    const { name, description, departmentId } = input || {}

    if (!name?.trim()) throw new Error('Thiếu tên chức vụ')

    // Nếu gán vào phòng ban, cần kiểm tra phòng ban có tồn tại không
    if (departmentId) {
        const department = await prisma.department.findUnique({
            where: { id: departmentId }
        })
        if (!department) {
            throw new Error('Không tìm thấy phòng ban')
        }
    }

    const position = await prisma.position.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            departmentId: departmentId || null,
        },
    })

    return position
}

/**
 * Cập nhật thông tin chức vụ.
 * 
 * @param {Object} input - { positionId, name, description, departmentId }
 * @returns {Promise<PositionResponse>}
 */
const updatePosition = async (input) => {
    const { positionId, name, description, departmentId } = input || {}

    if (!positionId) throw new Error('Thiếu ID chức vụ')

    const existing = await prisma.position.findUnique({ where: { id: positionId } })
    if (!existing) throw new Error('Không tìm thấy chức vụ')

    const updateData = {}
    
    if (name !== undefined) {
        if (!name.trim()) throw new Error('Tên chức vụ không được để trống')
        updateData.name = name.trim()
    }
    
    if (description !== undefined) {
        updateData.description = description?.trim() || null
    }

    if (departmentId !== undefined) {
        if (departmentId) {
            const department = await prisma.department.findUnique({
                where: { id: departmentId }
            })
            if (!department) {
                throw new Error('Không tìm thấy phòng ban')
            }
        }
        updateData.departmentId = departmentId || null
    }

    const updatedPosition = await prisma.position.update({
        where: { id: positionId },
        data: updateData,
    })

    return updatedPosition
}

/**
 * Xóa chức vụ.
 * 
 * @param {Object} input - { positionId }
 * @returns {Promise<BaseResponse>}
 */
const deletePosition = async (input) => {
    const { positionId } = input || {}

    if (!positionId) throw new Error('Thiếu ID chức vụ')

    const existing = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
            _count: {
                select: { users: true }
            }
        }
    })

    if (!existing) throw new Error('Không tìm thấy chức vụ')

    // Ràng buộc bảo vệ dữ liệu: không cho phép xóa nếu đang có user giữ chức vụ này
    if (existing._count.users > 0) {
        throw new Error(`Không thể xóa chức vụ đang có người đảm nhận (${existing._count.users} người)`)
    }

    await prisma.position.delete({
        where: { id: positionId },
    })

    return {
    }
}

export default {
    getPositionById,
    getPositions,
    getPositionsByDepartment,
    createPosition,
    updatePosition,
    deletePosition,
}
