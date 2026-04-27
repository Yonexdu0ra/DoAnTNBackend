// ═══════════════════════════════════════════
//  User Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'
import { hashPassword } from '../utils/hash.js'

// ── Filter options ──
const USER_FILTER_OPTIONS = {
    keywordFields: ['email', 'phone', 'code', 'profile.fullName'],
    inFieldMap: {
        roleIn: 'role',
    },
}

// ── Query ──

/**
 * Lấy thông tin cá nhân của người dùng hiện tại (me)
 */
const me = async (userId, select) => {
    if (!userId) throw new Error('Thiếu ID người dùng')
    
    const findArgs = { where: { id: userId, deletedAt: null } }
    if (select) findArgs.select = select
    
    const user = await prisma.user.findUnique(findArgs)
    if (!user) throw new Error('Không tìm thấy người dùng')

    return user
}

/**
 * Lấy user theo ID (dành cho Admin/Manager)
 */
const getUserById = async (id, select) => {
    if (!id) throw new Error('Thiếu ID người dùng')

    const findArgs = { where: { id, deletedAt: null } }
    if (select) findArgs.select = select

    const user = await prisma.user.findUnique(findArgs)
    if (!user) throw new Error('Không tìm thấy người dùng')

    return user
}

/**
 * Lấy danh sách users (phân trang, filter)
 */
const getUsers = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    filterWhere.deletedAt = null // chỉ lấy user chưa bị xóa mềm

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.user.findMany(findArgs),
        prisma.user.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

/**
 * Tìm kiếm Manager (dành cho giao diện gán Manager cho Job)
 */
const searchManager = async (search, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    const extraWhere = { ...filterWhere, role: 'MANAGER', deletedAt: null }

    if (search) {
        extraWhere.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { profile: { fullName: { contains: search, mode: 'insensitive' } } },
        ]
    }

    const findArgs = {
        where: extraWhere,
        take: 50,
    }
    if (select) findArgs.select = select

    const items = await prisma.user.findMany(findArgs)

    return {
        nodes: items,
        pageInfo: buildPageInfo({ page: 1, limit: items.length }, items.length)
    }
}

/**
 * Tìm kiếm users theo tên, email, số điện thoại, mã nhân viên (Admin)
 */
const searchUser = async (search, pagination, orderBy, filter, select) => {
    const keyword = typeof search === 'string' ? search.trim() : ''
    const filterWhere = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    const extraWhere = {
        ...filterWhere,
        deletedAt: null,
    }

    if (keyword) {
        const searchOr = [
            { email: { contains: keyword, mode: 'insensitive' } },
            { phone: { contains: keyword, mode: 'insensitive' } },
            { code: { contains: keyword, mode: 'insensitive' } },
            { profile: { fullName: { contains: keyword, mode: 'insensitive' } } },
        ]

        if (Array.isArray(extraWhere.OR) && extraWhere.OR.length > 0) {
            extraWhere.AND = [
                ...(Array.isArray(extraWhere.AND) ? extraWhere.AND : []),
                { OR: extraWhere.OR },
                { OR: searchOr },
            ]
            delete extraWhere.OR
        } else {
            extraWhere.OR = searchOr
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.user.findMany(findArgs),
        prisma.user.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

/**
 * Lấy danh sách users trong một job
 */
const getUsersByJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const baseFilter = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    const extraWhere = {
        ...baseFilter,
        deletedAt: null,
        userJoinedJobs: {
            some: { jobId }
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.user.findMany(findArgs),
        prisma.user.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total)
    }
}

/**
 * Lấy danh sách employees CHƯA tham gia vào job
 */
const searchEmployeesNotInJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const baseFilter = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    const extraWhere = {
        ...baseFilter,
        role: 'EMPLOYEE',
        deletedAt: null,
        userJoinedJobs: {
            none: { jobId }
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.user.findMany(findArgs),
        prisma.user.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total)
    }
}

/**
 * Lấy danh sách employees ĐÃ tham gia vào job
 */
const searchEmployeesByJob = async (jobId, pagination, orderBy, filter, select) => {
    if (!jobId) throw new Error('Thiếu ID công việc')

    const baseFilter = buildPrismaFilter(filter, USER_FILTER_OPTIONS)
    const extraWhere = {
        ...baseFilter,
        role: 'EMPLOYEE',
        deletedAt: null,
        userJoinedJobs: {
            some: { jobId } // đã nằm trong job
        }
    }

    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, extraWhere)

    const [items, total] = await Promise.all([
        prisma.user.findMany(findArgs),
        prisma.user.count({ where: extraWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total)
    }
}

// ── Mutation ──

const DEFAULT_PASSWORD = 'Password@123'

/**
 * Tạo user mới (Admin only)
 */
const createUser = async (input) => {
    const { email, phone, code, role, biometricEnabled, departmentId, positionId, profile } = input || {}

    if (!email || !phone) throw new Error('Thiếu email hoặc số điện thoại')

    // Kiểm tra trùng lặp email và phone
    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { phone }, ...(code ? [{ code }] : [])],
            deletedAt: null
        }
    })

    if (existing) {
        if (existing.email === email) throw new Error('Email đã được sử dụng')
        if (existing.phone === phone) throw new Error('Số điện thoại đã được sử dụng')
        if (existing.code === code) throw new Error('Mã nhân viên đã được sử dụng')
    }

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)

    const createData = {
        email,
        phone,
        password: hashedPassword,
        code: code || phone,
        role: role || 'EMPLOYEE',
        biometricEnabled: biometricEnabled || false,
        departmentId: departmentId || null,
        positionId: positionId || null,
    }

    if (profile) {
        const { fullName, gender, address, birthday, avatarUrl, bio } = profile
        if (!fullName || !gender || !address || !birthday) {
            throw new Error('Thiếu thông tin bắt buộc trong profile (họ tên, giới tính, địa chỉ, ngày sinh)')
        }

        createData.profile = {
            create: {
                fullName,
                gender,
                address,
                birthday: new Date(birthday),
                avatarUrl: avatarUrl || undefined,
                bio: bio || null,
            }
        }
    } else {
        throw new Error('Thiếu thông tin profile cơ bản')
    }

    return prisma.user.create({ data: createData })
}

/**
 * Cập nhật thông tin user (Admin only)
 */
const updateUser = async (input) => {
    const { userId, email, phone, code, role, biometricEnabled, departmentId, positionId, profile } = input || {}

    if (!userId) throw new Error('Thiếu ID người dùng')

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new Error('Không tìm thấy người dùng')

    const updateData = {}
    
    // Check conflicts
    if (email || phone || code) {
        const checkOr = []
        if (email && email !== user.email) checkOr.push({ email })
        if (phone && phone !== user.phone) checkOr.push({ phone })
        if (code && code !== user.code) checkOr.push({ code })

        if (checkOr.length > 0) {
            const conflict = await prisma.user.findFirst({
                where: { OR: checkOr, id: { not: userId }, deletedAt: null }
            })
            if (conflict) {
                if (email && conflict.email === email) throw new Error('Email đã được người khác sử dụng')
                if (phone && conflict.phone === phone) throw new Error('Số điện thoại đã được người khác sử dụng')
                if (code && conflict.code === code) throw new Error('Mã nhân viên đã được người khác sử dụng')
            }
        }
    }

    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (code !== undefined) updateData.code = code
    if (role !== undefined) updateData.role = role
    if (biometricEnabled !== undefined) updateData.biometricEnabled = biometricEnabled
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (positionId !== undefined) updateData.positionId = positionId

    // Cập nhật quan hệ Profile nếu có truyền
    if (profile) {
        const { fullName, gender, address, birthday, avatarUrl, bio } = profile
        updateData.profile = {
            upsert: {
                create: {
                    fullName,
                    gender,
                    address,
                    birthday: birthday ? new Date(birthday) : new Date(),
                    avatarUrl: avatarUrl || undefined,
                    bio: bio || null,
                },
                update: {
                    fullName: fullName !== undefined ? fullName : undefined,
                    gender: gender !== undefined ? gender : undefined,
                    address: address !== undefined ? address : undefined,
                    birthday: birthday !== undefined ? new Date(birthday) : undefined,
                    avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
                    bio: bio !== undefined ? bio : undefined,
                }
            }
        }
    }

    return prisma.user.update({
        where: { id: userId },
        data: updateData
    })
}

/**
 * Xóa user (Soft delete)
 */
const deleteUser = async (input) => {
    const { userId } = input || {}
    if (!userId) throw new Error('Thiếu ID người dùng')

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new Error('Không tìm thấy người dùng')

    await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), isLocked: true }
    })

    return true
}

/**
 * Reset password cho user (Admin only) về password mặc định
 */
const resetUserPassword = async (input) => {
    const { userId } = input || {}
    if (!userId) throw new Error('Thiếu ID người dùng')

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new Error('Không tìm thấy người dùng')

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    })

    return true
}

/**
 * Toggle trạng thái isLocked
 */
const toggleLockUser = async (input) => {
    const { userId, isLocked } = input || {}
    if (!userId) throw new Error('Thiếu ID người dùng')
    if (isLocked === undefined) throw new Error('Thiếu giá trị khóa/mở khóa')

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new Error('Không tìm thấy người dùng')

    return prisma.user.update({
        where: { id: userId },
        data: { isLocked }
    })
}

export default {
    me,
    getUserById,
    getUsers,
    searchManager,
    searchUser,
    getUsersByJob,
    searchEmployeesNotInJob,
    searchEmployeesByJob,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    toggleLockUser,
}
