import prisma from '../configs/prismaClient.js'

/**
 * Cập nhật hoặc tạo profile
 */
const updateProfile = async (userId, input) => {
    const existingProfile = await prisma.profile.findUnique({ where: { userId } })

    if (existingProfile) {
        return prisma.profile.update({
            where: { userId },
            data: {
                ...(input.fullName !== undefined && { fullName: input.fullName }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
                ...(input.bio !== undefined && { bio: input.bio }),
            },
        })
    }

    return prisma.profile.create({
        data: {
            userId,
            fullName: input.fullName || '',
            address: input.address || '',
            avatarUrl: input.avatarUrl,
            bio: input.bio,
        },
    })
}

export default { updateProfile }
