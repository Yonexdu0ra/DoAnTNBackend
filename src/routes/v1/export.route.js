import { Router } from 'express';
import { requireToken } from '../../middlewares/auth.middleware.js';
import { exportJobReport } from '../../controllers/export.controller.js';

const router = Router();

// Route: GET /v1/export/job/:jobId?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
router.get('/job/:jobId', requireToken, exportJobReport);

export default router;
