// ── UserDevice service ──
// Hiện tại schema không có query/mutation trực tiếp cho UserDevice
// Service này tạo sẵn cho việc mở rộng sau này

import prisma from '../configs/prismaClient.js'

// ── Helper: lấy danh sách thiết bị của user ──
const getDevicesByUser = async (userId) => {
    const data = await prisma.userDevice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    })

    return {
        status: 'success',
        code: 200,
        message: 'Lấy danh sách thiết bị thành công',
        data,
    }
}

// ── Helper: upsert thiết bị ──
const upsertDevice = async ({ userId, deviceId, platform, deviceName, ipAddress, fcmToken }) => {
    const existing = await prisma.userDevice.findFirst({
        where: { userId, deviceId },
    })

    if (existing) {
        return prisma.userDevice.update({
            where: { id: existing.id },
            data: { platform, deviceName, ipAddress, fcmToken },
        })
    }

    return prisma.userDevice.create({
        data: { userId, deviceId, platform, deviceName, ipAddress, fcmToken },
    })
}

export default {
    getDevicesByUser,
    upsertDevice,
}
