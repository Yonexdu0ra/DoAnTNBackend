import { client } from '../configs/redisClient.js'

// TTL constants (seconds)
export const CACHE_TTL = {
    STATISTICS: 300,      // 5 phút
    HOLIDAYS: 600,        // 10 phút
    PAGINATED_LIST: 180,  // 3 phút
}

// Cache key prefixes
export const CACHE_KEYS = {
    STATISTICS_ADMIN: 'stats:admin',
    STATISTICS_MANAGER: (userId) => `stats:manager:${userId}`,
    STATISTICS_DASHBOARD_ADMIN: (filterHash) => `stats:dashboard:admin:${filterHash}`,
    STATISTICS_DASHBOARD_MANAGER: (userId, filterHash) => `stats:dashboard:manager:${userId}:${filterHash}`,
    STATISTICS_DASHBOARD_EMPLOYEE: (userId, filterHash) => `stats:dashboard:employee:${userId}:${filterHash}`,
    HOLIDAYS: (startDate, endDate) => `holidays:${startDate}:${endDate}`,
    USERS_LIST: (page, limit, orderField, orderDir, searchField, searchValue) =>
        `users:p${page}:l${limit}:o${orderField}:${orderDir}:s${searchField || ''}:${searchValue || ''}`,
    JOBS_LIST: (page, limit, orderField, orderDir, searchField, searchValue) =>
        `jobs:p${page}:l${limit}:o${orderField}:${orderDir}:s${searchField || ''}:${searchValue || ''}`,
}

/**
 * Lấy dữ liệu từ Redis cache
 */
export const getCache = async (key) => {
    try {
        const data = await client.get(key)
        return data ? JSON.parse(data) : null
    } catch (error) {
        console.error(`Redis getCache error for key ${key}:`, error.message)
        return null
    }
}

/**
 * Set dữ liệu vào Redis cache với TTL
 */
export const setCache = async (key, data, ttl) => {
    try {
        await client.set(key, JSON.stringify(data), 'EX', ttl)
    } catch (error) {
        console.error(`Redis setCache error for key ${key}:`, error.message)
    }
}

/**
 * Xóa cache theo pattern (dùng SCAN để tránh block Redis)
 */
export const invalidateCache = async (pattern) => {
    try {
        let cursor = '0'
        do {
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = nextCursor
            if (keys.length > 0) {
                await client.del(...keys)
            }
        } while (cursor !== '0')
    } catch (error) {
        console.error(`Redis invalidateCache error for pattern ${pattern}:`, error.message)
    }
}

/**
 * Xóa một key cụ thể
 */
export const deleteCache = async (key) => {
    try {
        await client.del(key)
    } catch (error) {
        console.error(`Redis deleteCache error for key ${key}:`, error.message)
    }
}
