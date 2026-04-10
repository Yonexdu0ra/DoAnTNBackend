import prisma from '../configs/prismaClient.js'

// ── Mutation: cập nhật thông tin profile ──
const updateProfile = async (userId, input) => {
    // Tìm profile hiện tại
    const existing = await prisma.profile.findUnique({
        where: { userId },
    })
    if (!existing) throw new Error('Profile không tồn tại')

    const updated = await prisma.profile.update({
        where: { userId },
        data: {
            ...(input.fullName !== undefined && { fullName: input.fullName }),
            ...(input.gender !== undefined && { gender: input.gender }),
            ...(input.address !== undefined && { address: input.address }),
            ...(input.birthday !== undefined && { birthday: input.birthday }),
            ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
            ...(input.bio !== undefined && { bio: input.bio }),
        },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Cập nhật thông tin cá nhân thành công',
        data: updated,
    }
}

export default {
    updateProfile,
}
