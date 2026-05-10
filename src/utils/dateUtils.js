// ═══════════════════════════════════════════
//  Date Utilities (UTC-normalized)
//  Dùng cho các trường date-only (@db.Date)
//  để tránh lệch múi giờ khi client gửi ISO string
// ═══════════════════════════════════════════

/**
 * Normalize một Date object về UTC midnight (00:00:00.000Z).
 * Dùng cho các trường date-only (như attendance.date) khi cần
 * so sánh với cột @db.Date trong PostgreSQL.
 *
 * Ví dụ:
 * - Client +7 gửi "2026-05-08T17:00:00.000Z" (tức 09/05 giờ VN)
 * - toUTCMidnight() → 2026-05-08T00:00:00.000Z (giữ nguyên ngày UTC)
 *
 * - Nếu muốn lấy ngày theo local timezone của date:
 *   Dùng toUTCMidnightFromLocal() thay thế
 *
 * @param {Date|string} date
 * @returns {Date} UTC midnight date
 */
export const toUTCMidnight = (date) => {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Lấy khoảng thời gian "hôm nay" theo UTC.
 * today = 00:00:00.000Z hôm nay
 * tomorrow = 00:00:00.000Z ngày mai
 *
 * @returns {{ today: Date, tomorrow: Date }}
 */
export const getUTCTodayRange = () => {
    const now = new Date()
    const today = toUTCMidnight(now)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    return { today, tomorrow }
}

/**
 * Lấy khoảng thời gian tháng hiện tại theo UTC.
 * fromDate = ngày 1 tháng hiện tại 00:00:00.000Z
 * toDate   = ngày 1 tháng sau 00:00:00.000Z
 *
 * @returns {{ fromDate: Date, toDate: Date }}
 */
export const getUTCCurrentMonthRange = () => {
    const now = new Date()
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    return { fromDate, toDate }
}

/**
 * Lấy khoảng thời gian năm hiện tại theo UTC.
 * fromDate = 01/01 năm hiện tại 00:00:00.000Z
 * toDate   = 01/01 năm sau 00:00:00.000Z
 *
 * @returns {{ fromDate: Date, toDate: Date }}
 */
export const getUTCCurrentYearRange = () => {
    const now = new Date()
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const toDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
    return { fromDate, toDate }
}

/**
 * Tạo UTC midnight date cho ngày đầu tháng từ một date bất kỳ.
 *
 * @param {Date} date
 * @returns {Date} UTC midnight ngày đầu tháng
 */
export const getUTCMonthStart = (date) => {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

/**
 * Tạo UTC midnight date cho ngày đầu năm từ một date bất kỳ.
 *
 * @param {Date} date
 * @returns {Date} UTC midnight ngày 01/01
 */
export const getUTCYearStart = (date) => {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
}
