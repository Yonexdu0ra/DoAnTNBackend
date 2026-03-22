import prisma from '../configs/prismaClient.js'
import { comparePassword } from '../utils/hash.js';
import { generateRefreshToken, generateAccessToken, verifyRefreshToken } from '../utils/token.js';
import { client } from '../configs/redisClient.js'


const login = async (idenfier, password) => {
    try {
        // tìm user theo email hoặc code
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: idenfier },
                    { code: idenfier },
                ],
            },
            select: {
                email: true,
                password: true,
                code: true,
                role: true,
                id: true,
                profile: {
                    select: {
                        fullName: true,
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        
        const isCorrectPassword = await comparePassword(password, user.password)
        if (!isCorrectPassword) throw new Error('Mật khẩu không chính xác');
        // trả về thông tin user (không bao gồm mật khẩu)
        const session = await prisma.session.findFirst({
            where: { userId: user.id },
            select: { token: true, expiresAt: true },
        });
        const { password: _, ...userWithoutPassword } = user;
        const access_token = generateAccessToken(userWithoutPassword);
        const refresh_token = generateRefreshToken(userWithoutPassword);
        if (!session) {
            // create
            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: refresh_token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
                }
            });
        } else {
            // update
            await prisma.session.updateMany({
                where: { userId: user.id },
                data: {
                    token: refresh_token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
                }
            });
        }
        return { user: userWithoutPassword, access_token, refresh_token };
    } catch (error) {
        throw error;
    }
}

const refreshToken = async (refreshToken) => {
    try {
        //  kỹ thuật Grace Period  tránh race condition khi refresh token liên tục 
        const graceData = await client.get(`grace_period:${refreshToken}`);
        if (graceData) {
            return JSON.parse(graceData);
        }
        // verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) throw new Error('Refresh token không hợp lệ');
        const session = await prisma.session.findFirst({
            where: { token: refreshToken },
        });
        // console.log(session);

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
                    }
                }
            }
        });
        if (!user) throw new Error('Tài khoản không tồn tại');
        const access_token = generateAccessToken(user);
        const refresh_token = generateRefreshToken(user);
        await prisma.session.updateMany({
            where: {
                token: refreshToken
            },
            data: {
                token: refresh_token
            }
        })
        await client.set(
            `grace_period:${refreshToken}`,
            JSON.stringify({ access_token, refresh_token }),
            'EX', 30
        );
        return { access_token, refresh_token };
    } catch (error) {
        // console.log(error.message);

        throw error;
    }
}

const logout = async (refreshToken) => {
    try {
        // Xóa refresh token khỏi database hoặc blacklist (nếu có)
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) throw new Error('Refresh token không hợp lệ');
        const session = await prisma.session.updateMany({
            where: { token: refreshToken },
            data: { expiresAt: new Date() },
        });
        // thêm refresh token vào blacklist redis
        return true;
    } catch (error) {
        throw error;
    }
}

export default {
    login,
    refreshToken,
    logout,
}