import { Router } from 'express'
import { login, refreshToken, logout } from '../../controllers/auth.controller.js'
import { verifyAccessToken } from '../../utils/token.js';
const router = Router();
const requireAuth = (req, res, next) => {
  try {

    if(!req.headers.authorization) throw new Error("Bạn không có quyền truy cập tài nguyên này!")
    const token = req.headers.authorization.split(' ')[1];


    if (!token) throw new Error("Bạn không có quyền truy cập tài nguyên này!")
    
    const tokenDecoded = verifyAccessToken(token);

    if (!tokenDecoded) throw new Error("Bạn không có quyền truy cập tài nguyên này!")
    req.user = tokenDecoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message, success: false, data: null});
  }
}
router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.post('/logout', requireAuth, logout)
export default router;