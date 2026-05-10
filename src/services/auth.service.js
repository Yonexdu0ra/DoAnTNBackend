import prisma from '../configs/prismaClient.js'
import { createAuditLog } from '../utils/auditLog.js'
import { comparePassword, hashPassword } from '../utils/hash.js';
import { generateRefreshToken, generateAccessToken, verifyRefreshToken } from '../utils/token.js';
import { client } from '../configs/redisClient.js'
import { sendMail } from '../configs/mail.js'
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
       
        const email = identifier?.toLowerCase();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { code: identifier },
                    // { phone: identifier },
                ],
            },
            select: {
                email: true,
                password: true,
                code: true,
                role: true,
                id: true,
                phone: true,
                isLocked: true,
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        if(user.isLocked) throw new Error('Tài khoản đã bị khóa');
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
        await upsertUserDeviceFcm({
            userId: user.id,
            deviceId: deviceMeta.deviceId,
            fcmToken: deviceMeta.fcmToken,
            platform: deviceMeta.platform,
            ipAddress: deviceMeta.ipAddress,
        })

        createAuditLog({
            userId: user.id,
            action: 'LOGIN',
            resource: 'User',
            resourceId: user.id,
            ipAddress: deviceMeta.ipAddress,
            userAgent: deviceMeta.platform,
            status: 'SUCCESS'
        });

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

const loginWithBiometric = async (userId, deviceMeta = {}) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            email: true,
            code: true,
            role: true,
            id: true,
            password: true,
            isLocked: true,
            profile: {
                select: {
                    fullName: true,
                    avatarUrl: true,
                }
            }
        }
    });
    if (!user) throw new Error('Tài khoản không tồn tại');
    if(user.isLocked) throw new Error('Tài khoản đã bị khóa');
    const { password: _, ...userWithoutPassword } = user;
    const access_token = generateAccessToken(userWithoutPassword);
    const refresh_token = generateRefreshToken(userWithoutPassword);
    
    
    
    await upsertSession({
        userId: user.id,
        token: refresh_token,
        ipAddress: deviceMeta.ipAddress,
    });
    await upsertUserDeviceFcm({
        userId: user.id,
        deviceId: deviceMeta.deviceId,
        fcmToken: deviceMeta.fcmToken,
        platform: deviceMeta.platform,
        ipAddress: deviceMeta.ipAddress,
    });

    return {
        user: userWithoutPassword,
        access_token,
        refresh_token,
    };
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
                isLocked: true,
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        if(user.isLocked) throw new Error('Tài khoản đã bị khóa');
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

        createAuditLog({
            userId: decoded.id,
            action: 'LOGOUT',
            resource: 'User',
            resourceId: decoded.id,
            status: 'SUCCESS'
        });

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

const forgotPassword = async (email) => {
    const normalizedEmail = normalizeText(email)
    if (!normalizedEmail) throw new Error('Email is required')

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            profile: {
                select: {
                    fullName: true,
                }
            }
        }
    })

    if (!user) {
        return false;
    }

    const resetToken = generateAccessToken({ id: user.id }, '15m');
    const obj = { 
        to: user.email,
        subject: 'Yêu cầu đặt lại mật khẩu',
        text: `Xin chào ${user.profile.fullName || ''},\n\nBạn đã yêu cầu đặt lại mật khẩu. Vui lòng truy cập đường link sau để đặt lại mật khẩu của bạn:\n\nhttps://qujs.online/auth/reset-password?token=${resetToken} liên kết có hiệu lực trong 15 phút và chỉ sử dụng một lần\n\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\nTrân trọng,\nĐội ngũ hỗ trợ khách hàng`
    }
  
    // bỏ await để email gửi sau không cần phải chờ kết quả gửi mail, tránh trường hợp lỗi mail làm ảnh hưởng đến trải nghiệm người dùng
    sendMail(obj.to, obj.subject, obj.text);
    return true;
}

const resetPassword = async (token, newPassword) => {
    const cachedData = await client.get(`password_reset:${token}`);
    if(cachedData) throw new Error('Liên kết đã hết hiệu lực`');
    const decoded = verifyRefreshToken(token); 
    if(!decoded) throw new Error('Liên kết không hợp lệ hoặc đã hết hiệu lực');
    const userId = decoded.id;

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    await client.set(`password_reset:${token}`, 'used', 'EX', decoded.exp - Math.floor(Date.now() / 1000));
    return true;
}

const verifyResetToken = async (token) => {
    const cachedData = await client.get(`password_reset:${token}`);
    if(cachedData) throw new Error('Liên kết đã hết hiệu lực`');
    const decoded = verifyRefreshToken(token); 
    if(!decoded) throw new Error('Liên kết không hợp lệ hoặc đã hết hiệu lực');
    return true;
}

const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            password: true,
        }
    });

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
        throw new Error('Mật khẩu hiện tại không chính xác');
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
        return true;
}
export default {
    login,
    loginWithBiometric,
    refreshToken,
    logout,
    updateFcmToken,
    upsertSession,
    upsertUserDeviceFcm,
    createWebsocketToken,
    forgotPassword,
    resetPassword,
    verifyResetToken,
    changePassword
}