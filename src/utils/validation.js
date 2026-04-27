// ═══════════════════════════════════════════════════════════════
//  Zod validation utility dùng chung cho tất cả services
// ═══════════════════════════════════════════════════════════════

/**
 * Validate input data bằng Zod schema.
 *
 * - Nếu parse thành công → trả về data đã được normalize/transform
 * - Nếu parse thất bại → throw Error với message rõ ràng
 *
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {*} data - dữ liệu cần validate
 * @param {string} contextMessage - thông báo ngữ cảnh khi lỗi (ví dụ: 'Dữ liệu tạo user không hợp lệ')
 * @returns {*} parsed/validated data
 * @throws {Error} nếu validation thất bại
 */
export const validateInput = (schema, data, contextMessage = 'Dữ liệu không hợp lệ') => {
    const result = schema.safeParse(data)

    if (result.success) {
        return result.data
    }

    // Lấy danh sách lỗi từ Zod
    const errors = result.error.issues || result.error.errors || []

    if (errors.length === 0) {
        throw new Error(contextMessage)
    }

    // Format thông báo lỗi
    const errorMessages = errors.map((issue) => {
        const path = issue.path?.length > 0 ? issue.path.join('.') : null
        const message = issue.message || 'Giá trị không hợp lệ'
        return path ? `${path}: ${message}` : message
    })

    // Nếu chỉ có 1 lỗi → hiển thị trực tiếp
    if (errorMessages.length === 1) {
        throw new Error(`${contextMessage}: ${errorMessages[0]}`)
    }

    // Nhiều lỗi → liệt kê
    throw new Error(`${contextMessage}: ${errorMessages.join('; ')}`)
}
