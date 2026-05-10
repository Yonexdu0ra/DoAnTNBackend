import authService from "../services/auth.service.js";
import biometricService from "../services/biometric.service.js";
import getClientIp from '../utils/getClientIp.js'


export const login = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const fcmToken = req.headers['x-fcm-token'] || null;
    const deviceId = req.headers['x-device-id'] || null;
    const platform = req.headers['x-platform'] || null;
    const ipAddress = getClientIp(req);

    const data = await authService.login(identifier?.toUpperCase(), password, {
      fcmToken,
      deviceId,
      platform,
      ipAddress,
    });
    // xử lý cookie cho domain cho web admin và header auth cho mobile
    if (!['ios', 'android'].includes(platform?.toLowerCase())) {
      const MAX_AGE_COOKIE = 1000 * 60 * 60 * 24 * 7;
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        maxAge: MAX_AGE_COOKIE, // 7 days
        sameSite: 'none',
        domain: '.qujs.online',
      }
      res.cookie("refresh_token", data.refresh_token, cookieOptions);
      res.cookie("access_token", data.access_token, cookieOptions);
      delete data.refresh_token
      delete data.access_token
      if(data.user.role === "EMPLOYEE") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập vào hệ thống", data: null });
      }
    }
    return res.json({ data, success: true, message: "Đăng nhập thành công" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}


export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {

    const refresh_token = refreshToken || req.cookies?.refresh_token;
    if (!refresh_token) throw new Error('Refresh token is required');
    const fcmToken = req.headers['x-fcm-token'] || null;
    const deviceId = req.headers['x-device-id'] || null;
    const platform = req.headers['x-platform'] || null;
    const userId = req.user?.id || null;
    const ipAddress = getClientIp(req);
    await authService.logout(refresh_token, {
      fcmToken,
      deviceId,
      userId,
      ipAddress,
    });
    if (!['ios', 'android'].includes(platform?.toLowerCase())) {
      const MAX_AGE_COOKIE = 0;
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        maxAge: MAX_AGE_COOKIE, // 7 days
        sameSite: 'none',
        domain: '.qujs.online',
      }
      res.cookie("refresh_token", '', cookieOptions);
      res.cookie("access_token", '', cookieOptions);
      // delete data.refresh_token
      // delete data.access_token
    }
    return res.json({ message: 'Đăng xuất thành công', success: true, data: null });
  } catch (error) {
    console.log(error.message);

    res.status(400).json({ message: error.message, success: false, data: null });
  }
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required', success: false, data: null });
  try {
    const data = await authService.forgotPassword(email);
    if (!data) throw new Error("Email không tồn tại vui lòng kiểm tra lại")
    return res.status(200).json({ message: 'Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn.', success: true, data });
  } catch (error) {
    return res.status(400).json({ message: error.message, success: false, data: null });
  }
}
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token và mật khẩu mới là bắt buộc', success: false, data: null });
  try {
    const data = await authService.resetPassword(token, newPassword);
    return res.status(200).json({ message: 'Đặt lại mật khẩu thành công.', success: true, data });
  } catch (error) {
    return res.status(400).json({ message: error.message, success: false, data: null });
  }
}

export const verifyResetToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token là bắt buộc', success: false, data: null });
  try {
    const data = await authService.verifyResetToken(token);
    return res.status(200).json({ message: 'Token hợp lệ.', success: true, data });
  } catch (error) {
    return res.status(400).json({ message: error.message, success: false, data: null });
  }
}


export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req?.cookies.refresh_token
    const platform = req.headers['x-platform'] || null;

    if (!refreshToken) throw new Error('Refresh token is required');
    const data = await authService.refreshToken(refreshToken);

    const MAX_AGE_COOKIE = 1000 * 60 * 60 * 24 * 7;
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      maxAge: MAX_AGE_COOKIE, // 7 days
      sameSite: 'none',
      domain: '.qujs.online',
    }
    if (!['ios', 'android'].includes(platform?.toLowerCase())) {
      res.cookie("refresh_token", data.refresh_token, cookieOptions);
      res.cookie("access_token", data.access_token, cookieOptions);
      delete data.refresh_token
      delete data.access_token
    } else {
      res.cookie("refresh_token", data.refresh_token, { ...cookieOptions, maxAge: 0 });
      res.cookie("access_token", data.access_token, { ...cookieOptions, maxAge: 0 });
    }
    return res.status(200).json({ data, success: true, message: "refresh token thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message, success: false, data: null });
  }
}



export const updateFcmToken = async (req, res) => {
  const userId = req.user?.id;
  const { deviceId, fcmToken } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
  }
  if (!deviceId || !fcmToken) {
    return res.status(400).json({ success: false, message: 'Device ID and FCM token are required', data: null });
  }
  try {
    await authService.updateFcmToken(userId, deviceId, fcmToken);
    return res.json({ success: true, message: 'FCM token updated successfully', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
}

export const getWebsocketToken = async (req, res) => {
  try {
    const { user } = req
    const access_token = await authService.createWebsocketToken(user)
    return res.status(200).json({ data: { access_token }, success: true, message: "" });
  } catch (error) {
    return res.status(400).json({ message: error.message, success: false, data: null });
  }
}

export const changePassword = async (req, res) => {
  const userId = req.user?.id;
  const { newPassword, confirmPassword, oldPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không khớp', data: null });
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
  }
  if (!newPassword) {
    return res.status(400).json({ success: false, message: 'New password is required', data: null });
  }
  try {
    await authService.changePassword(userId, oldPassword, newPassword);
    return res.json({ success: true, message: 'Đã đổi mật khẩu thành công.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
}



export const registerBiometric = async (req, res) => {
  const userId = req.user?.id;
  const deviceId = req.headers['x-device-id'] || null;
  const { publicKey, type } = req.body;
  if (!type) return res.status(400).json({ success: false, message: 'Yêu cầu type', data: null });
  if (!deviceId) {
    return res.status(400).json({ success: false, message: 'Yêu cầu Device ID', data: null });
  }
  if (!publicKey) {
    return res.status(400).json({ success: false, message: 'Yêu cầu public key', data: null });
  }
  try {
    const data = await biometricService.registerBiometric(userId, {
      type: type || 'Biometrics',
      publicKey,
      deviceId
    });
    return res.json({ success: true, message: 'Đăng ký sinh trắc học thành công', data: null });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}

export const createChallenge = async (req, res) => {
  // const userId = req.user?.id;
  const userId = req.headers['x-user-id'] || null;
  const deviceId = req.headers['x-device-id'] || null;
  const challenge = await biometricService.createChallenge(userId, deviceId);
  return res.json({ success: true, message: 'Thành công', data: challenge });
}

export const verifyBiometric = async (req, res) => {
  // const userId = req.user?.id;
  const deviceId = req.headers['x-device-id'] || null;
  const fcmToken = req.headers['x-fcm-token'] || null;
  const platform = req.headers['x-platform'] || null;
  const ipAddress = getClientIp(req);
  const { signature, challenge, user_id } = req.body;
  if (!signature || !challenge) {
    return res.status(400).json({ success: false, message: 'Yêu cầu signature và challenge', data: null });
  }
  try {
    const data = await biometricService.verifyBiometric(user_id, deviceId, signature, challenge);
    const loginWithBiometric = await authService.loginWithBiometric(user_id, { fcmToken, platform, ipAddress, deviceId });
    return res.json({ success: true, message: 'Xác thực sinh trắc học thành công', data: loginWithBiometric });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}
export const deleteBiometric = async (req, res) => {
  const userId = req.user?.id;
  const deviceId = req.headers['x-device-id'] || null;
  try {
    await biometricService.deleteBiometric(userId, deviceId);
    return res.json({ success: true, message: 'Xóa sinh trắc học thành công', data: null });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}