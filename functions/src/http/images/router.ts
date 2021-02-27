// 3rd party imports
import * as express from 'express';

// Custom imports
import { createImage, checkFile, fetchAllImages, fetchOneImage } from './controller';
import { upload } from '../../utils/multipart-formdata-middleware'

const router = express.Router();

router.post('/', upload, checkFile, createImage);
router.get('/', fetchAllImages)
router.get('/:id', fetchOneImage)

export default router;
