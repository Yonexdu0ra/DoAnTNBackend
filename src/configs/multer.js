import multer from 'multer'


const upload = multer({
    storage: new multer.MemoryStorage(),
})