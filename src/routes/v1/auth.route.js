import { Router } from 'express'
import { login, refreshToken, logout, updateFcmToken, getWebsocketToken, forgotPassword, resetPassword, verifyResetToken, changePassword, registerBiometric, createChallenge, verifyBiometric, deleteBiometric } from '../../controllers/auth.controller.js'
import { getToken, verifyAccessToken } from '../../utils/token.js';
const router = Router();
export const requireAuth = (req, res, next) => {
  try {
    const token = getToken({ headers: req.headers, cookies: req.cookies });
    if (!token) throw new Error("Bạn không có quyền truy cập tài nguyên này!")

    const tokenDecoded = verifyAccessToken(token);

    if (!tokenDecoded) throw new Error("Bạn không có quyền truy cập tài nguyên này!")
    req.user = tokenDecoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message, success: false, data: null });
  }
}
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/verify-reset-token', verifyResetToken)
router.post('/refresh-token', refreshToken)
router.post('/logout', requireAuth, logout)
router.post('/change-password', requireAuth, changePassword)
router.post('/fcm-token', requireAuth, updateFcmToken)
router.post('/ws', requireAuth, getWebsocketToken)

// router.post('/biometric/register', requireAuth, registerBiometric)
// router.get('/biometric', requireAuth, getBiometrics)
// router.delete('/biometric/:id', requireAuth, deleteBiometric)
// router.post('/biometric/challenge', challengeBiometric)
// router.post('/biometric/verify', verifyBiometric)

router.post('/biometric/register', requireAuth, registerBiometric)
router.post('/biometric/delete', requireAuth, deleteBiometric)
router.get('/biometric/challenge',  createChallenge)
router.post('/biometric/verify',  verifyBiometric)
export default router;
