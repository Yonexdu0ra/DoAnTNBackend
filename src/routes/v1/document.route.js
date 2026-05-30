import { Router} from 'express'

const router = Router()


import { createSignedUrlUpload, getListDocument, getSignedUrl, uploadSignedUrlCompleted, deleteDocument, updateDocument } from '../../controllers/document.controller.js'

router.post('/', getListDocument)
router.get('/:fileName', getSignedUrl)
router.post('/signed-url', createSignedUrlUpload)
router.post('/signed-url/completed', uploadSignedUrlCompleted)
router.delete('/:fileName', deleteDocument)

export default router