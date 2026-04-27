import { Router} from 'express'

const router = Router()


import { createSignedUrlUpload, getListDocument, getSignedUrl, uploadSignedUrlCompleted } from '../../controllers/storage.controller.js'

router.post('/', getListDocument)
router.get('/:fileName', getSignedUrl)
router.post('/signed-url', createSignedUrlUpload)
router.post('/signed-url/completed', uploadSignedUrlCompleted)

export default router