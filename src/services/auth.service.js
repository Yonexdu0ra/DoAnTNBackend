import prisma from '../configs/prismaClient.js'
import { comparePassword } from '../utils/hash.js';
import { generateRefreshToken, generateAccessToken, verifyRefreshToken } from '../utils/token.js';
import { client } from '../configs/redisClient.js'

const REFRESH_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_DEVICE_PLATFORM = 'UNKNOWN'
const DEFAULT_IP_ADDRESS = '0.0.0.0'

const normalizeText = (value) => String(value || '').trim()

const normalizeDeviceId = (deviceId) => normalizeText(deviceId).slice(0, 255)

const normalizePlatform = (platform) => {
    const normalized = normalizeText(platform)
    if (!normalized) return DEFAULT_DEVICE_PLATFORM
    return normalized.slice(0, 50)
}

const normalizeIpAddress = (ipAddress) => {
    const normalizedIp = normalizeText(ipAddress).split(',')[0]?.trim()
    if (!normalizedIp) return DEFAULT_IP_ADDRESS
    return normalizedIp.slice(0, 45)
}

const resolveRefreshExpiresAt = (refreshToken) => {
    const decoded = verifyRefreshToken(refreshToken)
    if (decoded?.exp) {
        return new Date(decoded.exp * 1000)
    }

    return new Date(Date.now() + REFRESH_EXPIRE_MS)
}

const upsertSession = async ({ userId, token, ipAddress }) => {
    if (!userId || !token) {
        throw new Error('Thiếu thông tin phiên đăng nhập')
    }

    const existingSession = await prisma.session.findFirst({
        where: { userId },
        select: { id: true },
    })

    const data = {
        userId,
        token,
        expiresAt: resolveRefreshExpiresAt(token),
        ipAddress: normalizeIpAddress(ipAddress),
    }

    if (!existingSession) {
        return prisma.session.create({ data })
    }

    return prisma.session.update({
        where: { id: existingSession.id },
        data,
    })
}

const upsertUserDeviceFcm = async ({
    userId,
    deviceId,
    fcmToken,
    platform,
    ipAddress,
}) => {
    const normalizedUserId = normalizeText(userId)
    const normalizedDeviceId = normalizeDeviceId(deviceId)
    const normalizedFcmToken = normalizeText(fcmToken)

    if (!normalizedUserId || !normalizedDeviceId) {
        return null
    }

    const existingDevice = await prisma.userDevice.findFirst({
        where: {
            userId: normalizedUserId,
            deviceId: normalizedDeviceId,
        },
        select: { id: true },
    })

    const data = {
        userId: normalizedUserId,
        deviceId: normalizedDeviceId,
        platform: normalizePlatform(platform),
        ipAddress: normalizeIpAddress(ipAddress),
        ...(normalizedFcmToken ? { fcmToken: normalizedFcmToken } : {}),
    }

    if (!existingDevice) {
        return prisma.userDevice.create({
            data: {
                ...data,
                fcmToken: normalizedFcmToken || null,
            },
        })
    }

    return prisma.userDevice.update({
        where: { id: existingDevice.id },
        data,
    })
}


const login = async (identifier, password, deviceMeta = {}) => {
    try {
        // tìm user theo email hoặc code
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { code: identifier },
                    { phone: identifier },
                ],
            },
            select: {
                email: true,
                password: true,
                code: true,
                role: true,
                id: true,
                phone: true,
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        
        const isCorrectPassword = await comparePassword(password, user.password)
        if (!isCorrectPassword) throw new Error('Mật khẩu không chính xác');
        const { password: _, ...userWithoutPassword } = user;
        const access_token = generateAccessToken(userWithoutPassword);
        const refresh_token = generateRefreshToken(userWithoutPassword);

        const session = await upsertSession({
            userId: user.id,
            token: refresh_token,
            ipAddress: deviceMeta.ipAddress,
        })
        console.log(session);

        await upsertUserDeviceFcm({
            userId: user.id,
            deviceId: deviceMeta.deviceId,
            fcmToken: deviceMeta.fcmToken,
            platform: deviceMeta.platform,
            ipAddress: deviceMeta.ipAddress,
        })

        return {
            user: userWithoutPassword,
            access_token,
            refresh_token,
            // accessToken: access_token,
            // refreshToken: refresh_token,
        };
    } catch (error) {
        throw error;
    }
}

const refreshToken = async (refreshTokenValue) => {
    try {
        //  kỹ thuật Grace Period  tránh race condition khi refresh token liên tục 
        const graceData = await client.get(`grace_period:${refreshTokenValue}`);
        if (graceData) {
            return JSON.parse(graceData);
        }
        // verify refresh token
        const decoded = verifyRefreshToken(refreshTokenValue);
        if (!decoded) throw new Error('Refresh token không hợp lệ');
        const session = await prisma.session.findFirst({
            where: { token: refreshTokenValue },
        });
        console.log(session);

        if (!session) throw new Error('Refresh token không tồn tại');
        if (session.expiresAt < new Date()) throw new Error('Refresh token đã hết hạn');
        // tạo access token mới
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                email: true,
                code: true,
                role: true,
                id: true,
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        const access_token = generateAccessToken(user);
        const refresh_token = generateRefreshToken(user);

        await upsertSession({
            userId: user.id,
            token: refresh_token,
            ipAddress: session.ipAddress,
        })

        await client.set(
            `grace_period:${refreshTokenValue}`,
            JSON.stringify({
                access_token,
                refresh_token,
            }),
            'EX', 30
        );
        return {
            access_token,
            refresh_token,
        };
    } catch (error) {
        // console.log(error.message);

        throw error;
    }
}

const logout = async (refreshTokenValue, options = {}) => {
    try {
        // Xóa refresh token khỏi database hoặc blacklist (nếu có)
        const decoded = verifyRefreshToken(refreshTokenValue);
        if (!decoded) throw new Error('Refresh token không hợp lệ');

        await prisma.session.updateMany({
            where: { token: refreshTokenValue },
            data: { expiresAt: new Date() },
        });

        const userId = normalizeText(options.userId)
        const deviceId = normalizeDeviceId(options.deviceId)
        const fcmToken = normalizeText(options.fcmToken)

        if (userId && (deviceId || fcmToken)) {
            const where = {
                userId,
                ...(deviceId ? { deviceId } : {}),
                ...(fcmToken ? { fcmToken } : {}),
            }

            await prisma.userDevice.updateMany({
                where,
                data: {
                    fcmToken: null,
                    ipAddress: normalizeIpAddress(options.ipAddress),
                },
            })
        }

        // thêm refresh token vào blacklist redis
        return true;
    } catch (error) {
        throw error;
    }
}

const updateFcmToken = async (userId, deviceId, fcmToken, platform = null, ipAddress = null) => {
    const normalizedUserId = normalizeText(userId)
    const normalizedDeviceId = normalizeDeviceId(deviceId)
    const normalizedFcmToken = normalizeText(fcmToken)

    if (!normalizedUserId) throw new Error('Thiếu userId')
    if (!normalizedDeviceId) throw new Error('Thiếu deviceId')
    if (!normalizedFcmToken) throw new Error('Thiếu fcmToken')

    await upsertUserDeviceFcm({
        userId: normalizedUserId,
        deviceId: normalizedDeviceId,
        fcmToken: normalizedFcmToken,
        platform,
        ipAddress,
    })

    return true
}

const createWebsocketToken = async (user) => {
    const token = generateAccessToken(user, '2m');
    return token;
}

export default {
    login,
    refreshToken,
    logout,
    updateFcmToken,
    upsertSession,
    upsertUserDeviceFcm,
    createWebsocketToken
}