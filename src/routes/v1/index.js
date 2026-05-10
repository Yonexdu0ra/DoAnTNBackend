import { Router } from 'express'

import authRoute from './auth.route.js'
import chatRoute from './chat.route.js'
import storage from './storage.route.js'
import sidebarRoute from './sidebar.route.js'
import exportRoute from './export.route.js'

const router = Router();

router.use('/auth', authRoute)
router.use('/chat', chatRoute)
router.use('/storage', storage)
router.use('/sidebar', sidebarRoute)
router.use('/export', exportRoute)
export default router;