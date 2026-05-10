import prisma from '../configs/prismaClient.js'
import crypto from 'crypto';
import { client } from '../configs/redisClient.js';
/**
 * Lấy danh sách biometric của user
 */
const getBiometricsByUser = async (userId) => {
  return await prisma.biometric.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}
const createChallenge = async (userId, deviceId) => {
  const challenge = crypto.randomBytes(32).toString('base64');
  await client.set(`biometric_challenge:${userId}-${deviceId}`, challenge, 'EX', 300); // Lưu challenge vào Redis với TTL 5 phút

  return challenge;
}
/**
 * Đăng ký biometric mới cho user
 */
const registerBiometric = async (userId, input) => {
  const { type, publicKey, deviceId } = input

  if (!type || !publicKey || !deviceId) {
    throw new Error('Thiếu thông tin biometric (type, publicKey, deviceId)')
  }

  // Kiểm tra xem đã tồn tại public key này chưa (tránh trùng lặp)
  const existing = await prisma.biometric.findFirst({
    where: {
      userId,
      deviceId,
      type,
    }
  })

  if (existing) {
    // Cập nhật public key nếu đã tồn tại thiết bị & loại này
    return await prisma.biometric.update({
      where: { id: existing.id },
      data: { publicKey }
    })
  }

  return await prisma.biometric.create({
    data: {
      userId,
      type,
      publicKey,
      deviceId
    }
  })
}

/**
 * Xóa một biometric
 */
const deleteBiometric = async (userId, deviceId) => {
  const biometric = await prisma.biometric.findFirst({
    where: {
      userId,
      deviceId
    }
  })

  if (!biometric) {
    throw new Error('Không tìm thấy dữ liệu sinh trắc học')
  }

  if (biometric.userId !== userId) {
    throw new Error('Bạn không có quyền xóa dữ liệu này')
  }

  return await prisma.biometric.delete({
    where: { id: biometric.id }
  })
}


const verifyBiometric = async (userId, deviceId, signature, challenge) => {
  const biometric = await prisma.biometric.findFirst({
    where: {
      userId,
      deviceId,
    },
    select: {
      publicKey: true,
      userId: true,
      deviceId: true,
    }
  })

  if (!biometric) {
    throw new Error('Không tìm thấy dữ liệu sinh trắc học cho thiết bị này')
  }
  const storedChallenge = await client.get(`biometric_challenge:${userId}-${deviceId}`);
  
  if (storedChallenge !== challenge) {
    throw new Error('Challenge không hợp lệ')
  }
  const publicKey = `-----BEGIN PUBLIC KEY-----\n${biometric.publicKey}\n-----END PUBLIC KEY-----`
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(challenge);
  verify.end();
  const sig = Buffer.from(signature, 'base64');
  return verify.verify(publicKey, sig);
}

export default {
  getBiometricsByUser,
  registerBiometric,
  deleteBiometric,
  createChallenge,
  verifyBiometric
}
