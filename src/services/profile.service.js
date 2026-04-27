// ═══════════════════════════════════════════
//  Profile Service
// ═══════════════════════════════════════════

import prisma from '../configs/prismaClient.js'

/**
 * Cập nhật profile của người dùng hiện tại
 * 
 * @param {string} userId - ID người dùng đang đăng nhập
 * @param {Object} input - UpdateProfileInput
 * @returns {Promise<ProfileResponse>}
 */
const updateProfile = async (userId, input) => {
    if (!userId) throw new Error('Thiếu userId')
    if (!input) throw new Error('Dữ liệu cập nhật không hợp lệ')

    // Lấy profile hiện tại
    const existingProfile = await prisma.profile.findUnique({
        where: { userId },
    })

    if (!existingProfile) {
        throw new Error('Không tìm thấy profile của người dùng')
    }

    const { fullName, gender, address, birthday, avatarUrl, bio } = input
    const updateData = {}

    if (fullName !== undefined) {
        if (!fullName.trim()) throw new Error('Họ và tên không được để trống')
        updateData.fullName = fullName.trim()
    }
    if (gender !== undefined) updateData.gender = gender
    if (address !== undefined) updateData.address = address
    if (birthday !== undefined) updateData.birthday = new Date(birthday)
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (bio !== undefined) updateData.bio = bio

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
    })

    return updatedProfile
}

export default {
    updateProfile,
}
