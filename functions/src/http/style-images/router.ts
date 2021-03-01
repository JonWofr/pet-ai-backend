// 3rd party imports
import * as express from 'express'

// Custom imports
import { createStyleImage, deleteStyleImage, fetchAllStyleImages, fetchOneStyleImage } from './controller'
import { checkFile } from '../images/controller'
import { upload } from '../../utils/multipart-formdata-middleware'

const router = express.Router()

router.post('/', upload, checkFile, createStyleImage)
router.get('/', fetchAllStyleImages)
router.get('/:id', fetchOneStyleImage)
router.delete('/:id', deleteStyleImage)

export default router