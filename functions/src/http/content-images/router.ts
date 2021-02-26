// 3rd party imports
import * as express from 'express';

// Custom imports
import { createContentImage, fetchAllContentImages, fetchOneContentImage } from './controller';
import { upload } from '../../utils/multipart-formdata-middleware';
import { checkFile } from '../images/controller';

const router = express.Router();


router.post('/', upload, checkFile, createContentImage);
router.get('/', fetchAllContentImages);
router.get('/:id', fetchOneContentImage)

export default router;
