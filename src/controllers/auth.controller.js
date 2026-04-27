import authService from "../services/auth.service.js";
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
    }
    return res.json({ data, success: true, message: "Đăng nhập thành công" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
}


export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {

    const refresh_token = req.cookies?.refresh_token || refreshToken;
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

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req?.cookies.refresh_token || req.body.refreshToken
    const platform = req.headers['x-platform'] || null;
    console.log(refreshToken);

    if (!refreshToken) throw new Error('Refresh token is required');
    const data = await authService.refreshToken(refreshToken);
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