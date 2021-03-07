// 3rd party imports
import * as express from 'express';

// Custom imports
import {
  createContentImage,
  deleteContentImage,
  fetchAllContentImages,
  fetchOneContentImage,
} from './controller';
import { upload } from '../../utils/multipart-formdata-middleware';
import { checkFile } from '../images/controller';
import { validateToken } from '../../utils/jwt-validation-middleware';

const router = express.Router();

router.post('/', validateToken, upload, checkFile, createContentImage);
router.get('/', fetchAllContentImages);
router.get('/:id', fetchOneContentImage);
router.delete('/:id', deleteContentImage);

export default router;
