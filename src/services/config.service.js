// ═══════════════════════════════════════════
//  Config Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'
import {
    buildPagePaginationArgs,
    buildPageInfo,
    buildPrismaFilter,
} from '../utils/pagination.js'

// ── Filter options ──
const CONFIG_FILTER_OPTIONS = {
    keywordFields: ['key', 'description'],
    inFieldMap: {},
}

// ── Query ──

/**
 * Lấy cấu hình theo key.
 * 
 * @param {string} key - config key
 * @param {Object|null} select - Prisma select
 * @returns {Promise<ConfigResponse>}
 */
const getConfigByKey = async (key, select) => {
    if (!key) throw new Error('Thiếu key cấu hình')

    const findArgs = { where: { key } }
    if (select) findArgs.select = select

    const config = await prisma.config.findUnique(findArgs)

    if (!config) {
        throw new Error('Không tìm thấy cấu hình')
    }

    return config
}

/**
 * Lấy danh sách cấu hình.
 * 
 * @param {Object|null} pagination - { page, limit }
 * @param {Object|null} orderBy - { field, order }
 * @param {Object|null} filter - ConfigFilterInput
 * @param {Object|null} select - Prisma select
 * @returns {Promise<ConfigListResponse>}
 */
const getConfigs = async (pagination, orderBy, filter, select) => {
    const filterWhere = buildPrismaFilter(filter, CONFIG_FILTER_OPTIONS)
    const findArgs = buildPagePaginationArgs(pagination, orderBy, select, filterWhere)

    const [items, total] = await Promise.all([
        prisma.config.findMany(findArgs),
        prisma.config.count({ where: filterWhere }),
    ])

    return {
        nodes: items,
        pageInfo: buildPageInfo(pagination, total),
    }
}

// ── Mutation ──

/**
 * Tạo mới cấu hình.
 * 
 * @param {Object} input - { key, value }
 * @returns {Promise<ConfigResponse>}
 */
const createConfig = async (input) => {
    const { key, value } = input || {}

    if (!key || value === undefined) throw new Error('Thiếu thông tin (key, value)')

    // Kiểm tra xem key đã tồn tại chưa
    const existing = await prisma.config.findUnique({
        where: { key },
    })

    if (existing) {
        throw new Error(`Cấu hình với key "${key}" đã tồn tại`)
    }

    const config = await prisma.config.create({
        data: {
            key,
            value,
            description: '', // Schema GraphQL chưa có trường description cho input này
        },
    })

    return config
}

/**
 * Cập nhật cấu hình hiện có.
 * 
 * @param {Object} input - { configId, key, value }
 * @returns {Promise<ConfigResponse>}
 */
const updateConfig = async (input) => {
    const { configId, key, value } = input || {}

    if (!configId) throw new Error('Thiếu ID cấu hình')

    const existing = await prisma.config.findUnique({ where: { id: configId } })
    if (!existing) throw new Error('Không tìm thấy cấu hình')

    const updateData = {}
    if (key !== undefined) {
        // Kiểm tra xem key mới có bị trùng không
        if (key !== existing.key) {
            const collision = await prisma.config.findUnique({ where: { key } })
            if (collision) throw new Error(`Cấu hình với key "${key}" đã tồn tại`)
        }
        updateData.key = key
    }
    if (value !== undefined) updateData.value = value

    const updatedConfig = await prisma.config.update({
        where: { id: configId },
        data: updateData,
    })

    return updatedConfig
}

/**
 * Xóa cấu hình.
 * 
 * @param {Object} input - { configId }
 * @returns {Promise<ConfigResponse>}
 */
const deleteConfig = async (input) => {
    const { configId } = input || {}

    if (!configId) throw new Error('Thiếu ID cấu hình')

    const existing = await prisma.config.findUnique({ where: { id: configId } })
    if (!existing) throw new Error('Không tìm thấy cấu hình')

    await prisma.config.delete({
        where: { id: configId },
    })

    return existing
}

export default {
    getConfigByKey,
    getConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
}
