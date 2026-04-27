// ═══════════════════════════════════════════
//  Department Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const DEPARTMENT_FILTER_OPTIONS = {
    keywordFields: ['name', 'description'],
    inFieldMap: {},
}

// ── Query ──

/**
 * Lấy phòng ban theo ID.
 * 
 * @param {string} id - department ID
 * @param {Object|null} select - Prisma select
 * @returns {Promise<DepartmentResponse>}
 */
const getDepartmentById = async (id, select) => {
    if (!id) throw new Error('Thiếu ID phòng ban')

    const findArgs = { where: { id } }
    if (select) findArgs.select = select

    const department = await prisma.department.findUnique(findArgs)

    if (!department) {
        throw new Error('Không tìm thấy phòng ban')
    }

    return department
}

/**
 * Lấy danh sách phòng ban.
 * 
 * @param {Object|null} pagination - { page, limit }
 * @param {Object|null} orderBy - { field, order }
 * @param {Object|null} filter - DepartmentFilterInput
 * @param {Object|null} select - Prisma select
 * @returns {Promise<DepartmentListResponse>}
 */
const getDepartments = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, DEPARTMENT_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.department.findMany(findArgs),
        prisma.department.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Tạo mới phòng ban.
 * 
 * @param {Object} input - { name, description }
 * @returns {Promise<DepartmentResponse>}
 */
const createDepartment = async (input) => {
    const { name, description } = input || {}

    if (!name?.trim()) throw new Error('Thiếu tên phòng ban')

    const department = await prisma.department.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
        },
    })

    return department
}

/**
 * Cập nhật thông tin phòng ban.
 * 
 * @param {Object} input - { departmentId, name, description }
 * @returns {Promise<DepartmentResponse>}
 */
const updateDepartment = async (input) => {
    const { departmentId, name, description } = input || {}

    if (!departmentId) throw new Error('Thiếu ID phòng ban')

    const existing = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!existing) throw new Error('Không tìm thấy phòng ban')

    const updateData = {}
    if (name !== undefined) {
        if (!name.trim()) throw new Error('Tên phòng ban không được để trống')
        updateData.name = name.trim()
    }
    if (description !== undefined) {
        updateData.description = description?.trim() || null
    }

    const updatedDepartment = await prisma.department.update({
        where: { id: departmentId },
        data: updateData,
    })

    return updatedDepartment
}

/**
 * Xóa phòng ban.
 * 
 * @param {Object} input - { departmentId }
 * @returns {Promise<BaseResponse>}
 */
const deleteDepartment = async (input) => {
    const { departmentId } = input || {}

    if (!departmentId) throw new Error('Thiếu ID phòng ban')

    const existing = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
            _count: {
                select: { users: true, positions: true }
            }
        }
    })

    if (!existing) throw new Error('Không tìm thấy phòng ban')

    // Kiểm tra ràng buộc (không cho phép xóa nếu có nhân viên hoặc chức vụ)
    if (existing._count.users > 0) {
        throw new Error(`Không thể xóa phòng ban đang có nhân viên (${existing._count.users} người)`)
    }
    
    if (existing._count.positions > 0) {
        throw new Error(`Không thể xóa phòng ban đang có chức vụ (${existing._count.positions} chức vụ)`)
    }

    await prisma.department.delete({
        where: { id: departmentId },
    })

    return {
    }
}

export default {
    getDepartmentById,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
}
