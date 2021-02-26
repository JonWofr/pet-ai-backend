// 3rd party imports
import * as express from 'express';

// Custom imports
import { createImage, checkFile } from './controller';
import { upload } from '../../utils/multipart-formdata-middleware'

const router = express.Router();

router.post('/', upload, checkFile, createImage);

export default router;
