import prisma from '../configs/prismaClient.js'
import { buildPagePaginationArgs, buildPrismaFilter } from '../utils/pagination.js'
import { createAuditLog } from '../utils/auditLog.js'
import { hashPassword } from '../utils/hash.js'
import { generateId } from '../utils/generateId.js'

const KEYWORD_FIELDS = ['email', 'phone', 'code', 'profile.fullName']
const IN_FIELD_MAP = { roleIn: 'role' }
const INCLUDE_PROFILE = {
    profile: true,
    department: true,
    position: true,
}
const SOFT_DELETE_CONDITION = { deletedAt: null }

// ── Query: thông tin user hiện tại ──
const me = async (userId, select) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        ...(select ? { select } : {}),
    })
    if (!user) throw new Error('Tài khoản không tồn tại')

    return {
        status: 'success',
        code: 200,
        message: 'OK',
        data: user,
    }
}

// ── Query: danh sách users (admin, page-based) ──
const getUsers = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        ...SOFT_DELETE_CONDITION,
        ...filterWhere,
    })

    const [data, total] = await Promise.all([
        prisma.user.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.user.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách người dùng thành công',
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

// ── Query: tìm manager để thêm vào job (admin) ──
const searchManager = async (search, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const where = {
        ...SOFT_DELETE_CONDITION,
        role: 'MANAGER',
        ...filterWhere,
    }

    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { profile: { fullName: { contains: search, mode: 'insensitive' } } },
        ]
    }

    const data = await prisma.user.findMany({
        where,
        ...(select ? { select } : {}),
        take: 20,
        orderBy: { createdAt: 'desc' },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Tìm kiếm manager thành công',
        data,
        pagination: {
            page: 1,
            limit: 20,
            total: data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
        },
    }
}

// ── Query: danh sách nhân viên trong job (manager) ──
const getUsersByJob = async (
    jobId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        ...SOFT_DELETE_CONDITION,
        ...filterWhere,
        userJoinedJobs: {
            some: { jobId, status: 'APPROVED' },
        },
    })

    const [data, total] = await Promise.all([
        prisma.user.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.user.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách nhân viên theo công việc thành công',
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

// ── Query: tìm nhân viên chưa tham gia job (manager) ──
const searchEmployeesByJob = async (
    jobId,
    pagination,
    orderBy,
    filter,
    select,
) => {
    const filterWhere = buildPrismaFilter(filter, {
        keywordFields: KEYWORD_FIELDS,
        inFieldMap: IN_FIELD_MAP,
    })

    const args = buildPagePaginationArgs(pagination, orderBy, null, {
        ...SOFT_DELETE_CONDITION,
        role: 'EMPLOYEE',
        ...filterWhere,
        NOT: {
            userJoinedJobs: {
                some: { jobId },
            },
        },
    })
    const [data, total] = await Promise.all([
        prisma.user.findMany({
            ...args,
            ...(select ? { select } : {}),
        }),
        prisma.user.count({ where: args.where }),
    ])

    const page = pagination?.page || 1
    const limit = pagination?.limit || 10
    const totalPages = Math.ceil(total / limit)

    return {
        status: 'success',
        code: 200,
        message: 'Tìm kiếm nhân viên thành công',
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

// ── Mutation: tạo user (admin) ──
const createUser = async (input, adminUserId) => {
    // Check trùng email hoặc phone
    const exists = await prisma.user.findFirst({
        where: {
            OR: [{ email: input.email }, { phone: input.phone }],
        },
    })
    if (exists) throw new Error('Email hoặc số điện thoại đã tồn tại')

    // Tạo mã nhân viên nếu không có
    const code = input.code || `EMP-${generateId(6)}`
    // Mật khẩu mặc định
    const defaultPassword = await hashPassword('123456')

    const user = await prisma.user.create({
        data: {
            email: input.email,
            phone: input.phone,
            code,
            password: defaultPassword,
            role: input.role || 'EMPLOYEE',
            biometricEnabled: input.biometricEnabled || false,
            departmentId: input.departmentId || null,
            positionId: input.positionId || null,
            ...(input.profile && {
                profile: {
                    create: {
                        fullName: input.profile.fullName || '',
                        address: input.profile.address || '',
                        gender: input.profile.gender,
                        birthday: input.profile.birthday,
                        avatarUrl: input.profile.avatarUrl || undefined,
                        bio: input.profile.bio || null,
                    },
                },
            }),
        },
        include: INCLUDE_PROFILE,
    })

    await createAuditLog({
        userId: adminUserId,
        action: 'CREATE_USER',
        resource: 'User',
        resourceId: user.id,
        newValue: { ...user, password: undefined },
    })

    return {
        status: 'success',
        code: 201,
        message: 'Tạo người dùng thành công',
        data: user,
    }
}

// ── Mutation: cập nhật user (admin) ──
const updateUser = async (input, adminUserId) => {
    const existing = await prisma.user.findUnique({
        where: { id: input.userId },
        include: INCLUDE_PROFILE,
    })
    if (!existing) throw new Error('Người dùng không tồn tại')

    const updateData = {}
    if (input.email !== undefined) updateData.email = input.email
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.code !== undefined) updateData.code = input.code
    if (input.role !== undefined) updateData.role = input.role
    if (input.biometricEnabled !== undefined) updateData.biometricEnabled = input.biometricEnabled
    if (input.departmentId !== undefined) updateData.departmentId = input.departmentId
    if (input.positionId !== undefined) updateData.positionId = input.positionId

    if (input.profile) {
        updateData.profile = {
            upsert: {
                create: {
                    fullName: input.profile.fullName || '',
                    address: input.profile.address || '',
                    gender: input.profile.gender,
                    birthday: input.profile.birthday,
                    avatarUrl: input.profile.avatarUrl || undefined,
                    bio: input.profile.bio || null,
                },
                update: {
                    ...(input.profile.fullName !== undefined && { fullName: input.profile.fullName }),
                    ...(input.profile.address !== undefined && { address: input.profile.address }),
                    ...(input.profile.gender !== undefined && { gender: input.profile.gender }),
                    ...(input.profile.birthday !== undefined && { birthday: input.profile.birthday }),
                    ...(input.profile.avatarUrl !== undefined && { avatarUrl: input.profile.avatarUrl }),
                    ...(input.profile.bio !== undefined && { bio: input.profile.bio }),
                },
            },
        }
    }

    const updated = await prisma.user.update({
        where: { id: input.userId },
        data: updateData,
        include: INCLUDE_PROFILE,
    })

    await createAuditLog({
        userId: adminUserId,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: updated.id,
        oldValue: { ...existing, password: undefined },
        newValue: { ...updated, password: undefined },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật người dùng thành công',
        data: updated,
    }
}

// ── Mutation: xoá user (soft delete, admin) ──
const deleteUser = async (input, adminUserId) => {
    const existing = await prisma.user.findUnique({
        where: { id: input.userId },
    })
    if (!existing) throw new Error('Người dùng không tồn tại')

    await prisma.user.update({
        where: { id: input.userId },
        data: { deletedAt: new Date() },
    })

    await createAuditLog({
        userId: adminUserId,
        action: 'DELETE_USER',
        resource: 'User',
        resourceId: input.userId,
        oldValue: { ...existing, password: undefined },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Xoá người dùng thành công',
    }
}

// ── Mutation: reset mật khẩu (admin) ──
const resetUserPassword = async (input, adminUserId) => {
    const existing = await prisma.user.findUnique({
        where: { id: input.userId },
    })
    if (!existing) throw new Error('Người dùng không tồn tại')

    const defaultPassword = await hashPassword('123456')
    await prisma.user.update({
        where: { id: input.userId },
        data: { password: defaultPassword },
    })

    await createAuditLog({
        userId: adminUserId,
        action: 'RESET_PASSWORD',
        resource: 'User',
        resourceId: input.userId,
    })

    return {
        status: 'success',
        code: 200,
        message: 'Reset mật khẩu thành công. Mật khẩu mới: 123456',
    }
}

export default {
    me,
    getUsers,
    searchManager,
    getUsersByJob,
    searchEmployeesByJob,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
}
