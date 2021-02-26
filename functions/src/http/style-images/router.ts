// 3rd party imports
import * as express from 'express'

// Custom imports
import { createStyleImage, fetchAllStyleImages, fetchOneStyleImage } from './controller'
import { checkFile } from '../images/controller'
import { upload } from '../../utils/multipart-formdata-middleware'

const router = express.Router()

router.post('/', upload, checkFile, createStyleImage)
router.get('/', fetchAllStyleImages)
router.get('/:id', fetchOneStyleImage)


export default router