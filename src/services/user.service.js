import prisma from '../configs/prismaClient.js'
import { getCache, setCache, invalidateCache, CACHE_KEYS, CACHE_TTL } from '../utils/redisCache.js'
import { buildPagePaginationArgs } from '../utils/pagination.js'
import { hashPassword } from '../utils/hash.js'
import { generateId } from '../utils/generateId.js'
import { createAuditLog } from '../utils/auditLog.js'

const DEFAULT_PASSWORD = '123456'

/**
 * Lấy thông tin user hiện tại
 */
const getMe = async (userId, select = {}) => {
    const user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        ...select,
    })
    if (!user) throw new Error('Không tìm thấy người dùng')
    return user
}

/**
 * Tìm kiếm employee theo email hoặc code
 */
const searchEmployee = async (search, select = {}) => {
    if (!search?.field || !search?.value) return []

    const allowedFields = ['email', 'code']
    if (!allowedFields.includes(search.field)) {
        throw new Error(`Chỉ được tìm kiếm theo: ${allowedFields.join(', ')}`)
    }

    return prisma.user.findMany({
        where: {
            role: 'EMPLOYEE',
            deletedAt: null,
            [search.field]: { contains: search.value, mode: 'insensitive' },
        },
        take: 20,
        ...select,
    })
}

/**
 * Tìm kiếm manager theo email hoặc code
 */
const searchManager = async (search, select = {}) => {
    if (!search?.field || !search?.value) return []

    const allowedFields = ['email', 'code']
    if (!allowedFields.includes(search.field)) {
        throw new Error(`Chỉ được tìm kiếm theo: ${allowedFields.join(', ')}`)
    }

    return prisma.user.findMany({
        where: {
            role: 'MANAGER',
            deletedAt: null,
            [search.field]: { contains: search.value, mode: 'insensitive' },
        },
        take: 20,
        ...select,
    })
}

/**
 * Phân trang danh sách users (admin)
 */
const getUsers = async (pagination, orderBy, search, select = {}) => {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const cacheKey = CACHE_KEYS.USERS_LIST(
        page, limit,
        orderBy?.field || 'createdAt', orderBy?.direction || 'desc',
        search?.field, search?.value
    )

    const cached = await getCache(cacheKey)
    if (cached) return cached

    const paginationArgs = buildPagePaginationArgs(pagination, orderBy, search, { deletedAt: null })

    const [data, total] = await Promise.all([
        prisma.user.findMany({
            ...paginationArgs,
            ...select.select?.data ? { select: select.select.data.select } : {},
        }),
        prisma.user.count({ where: paginationArgs.where }),
    ])

    const result = { data, total }
    await setCache(cacheKey, result, CACHE_TTL.PAGINATED_LIST)
    return result
}

/**
 * Tạo user mới (admin)
 */
const createUser = async (input, adminId) => {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email: input.email }, { phone: input.phone }],
        },
    })
    if (existingUser) throw new Error('Email hoặc số điện thoại đã tồn tại')

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)
    const code = generateId(8)

    const user = await prisma.user.create({
        data: {
            email: input.email,
            phone: input.phone,
            code,
            password: hashedPassword,
            role: input.role || 'EMPLOYEE',
            ...(input.profile && {
                profile: {
                    create: {
                        fullName: input.profile.fullName || '',
                        address: input.profile.address || '',
                        avatarUrl: input.profile.avatarUrl,
                        bio: input.profile.bio,
                    },
                },
            }),
        },
        include: { profile: true },
    })

    await invalidateCache('users:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'CREATE_USER',
        resource: 'User',
        resourceId: user.id,
        newValue: { ...user, password: undefined },
        status: 'SUCCESS',
    })

    return { user, code, defaultPassword: DEFAULT_PASSWORD }
}

/**
 * Cập nhật user (admin)
 */
const updateUser = async (id, input, adminId) => {
    const oldUser = await prisma.user.findUnique({
        where: { id },
        include: { profile: true },
    })
    if (!oldUser) throw new Error('Người dùng không tồn tại')

    const user = await prisma.user.update({
        where: { id },
        data: {
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.role !== undefined && { role: input.role }),
            ...(input.profile && {
                profile: {
                    upsert: {
                        create: {
                            fullName: input.profile.fullName || '',
                            address: input.profile.address || '',
                            avatarUrl: input.profile.avatarUrl,
                            bio: input.profile.bio,
                        },
                        update: {
                            ...(input.profile.fullName !== undefined && { fullName: input.profile.fullName }),
                            ...(input.profile.address !== undefined && { address: input.profile.address }),
                            ...(input.profile.avatarUrl !== undefined && { avatarUrl: input.profile.avatarUrl }),
                            ...(input.profile.bio !== undefined && { bio: input.profile.bio }),
                        },
                    },
                },
            }),
        },
        include: { profile: true },
    })

    await invalidateCache('users:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: id,
        oldValue: { ...oldUser, password: undefined },
        newValue: { ...user, password: undefined },
        status: 'SUCCESS',
    })

    return user
}

/**
 * Reset mật khẩu user (admin)
 */
const resetPassword = async (id, adminId) => {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error('Người dùng không tồn tại')

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD)
    await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
    })

    await createAuditLog({
        userId: adminId,
        action: 'RESET_PASSWORD',
        resource: 'User',
        resourceId: id,
        status: 'SUCCESS',
    })

    return { user, defaultPassword: DEFAULT_PASSWORD }
}

/**
 * Khóa/mở khóa tài khoản user (admin)
 */
const toggleUserStatus = async (id, adminId) => {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error('Người dùng không tồn tại')

    const isLocked = !!user.deletedAt
    const updatedUser = await prisma.user.update({
        where: { id },
        data: { deletedAt: isLocked ? null : new Date() },
        include: { profile: true },
    })

    await invalidateCache('users:*')
    await invalidateCache('stats:admin')

    await createAuditLog({
        userId: adminId,
        action: isLocked ? 'UNLOCK_USER' : 'LOCK_USER',
        resource: 'User',
        resourceId: id,
        oldValue: { deletedAt: user.deletedAt },
        newValue: { deletedAt: updatedUser.deletedAt },
        status: 'SUCCESS',
    })

    return { user: updatedUser, isLocked }
}

export default {
    getMe,
    searchEmployee,
    searchManager,
    getUsers,
    createUser,
    updateUser,
    resetPassword,
    toggleUserStatus,
}
