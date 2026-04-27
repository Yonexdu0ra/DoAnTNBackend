import { Router } from 'express'
import { chat } from '../../controllers/chat.controller.js';
import { requireAuth } from './auth.route.js';
const router = Router();

router.post('/',requireAuth, chat)

export default router;