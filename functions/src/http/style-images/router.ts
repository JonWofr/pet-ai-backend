import * as express from 'express';
import {
  createStyleImage,
  deleteStyleImage,
  fetchAllStyleImages,
  fetchOneStyleImage,
} from './controller';
import { checkFile } from '../images/controller';
import { upload } from '../../utils/multipart-formdata-middleware';
import { validateToken } from '../../utils/jwt-validation-middleware';

const router = express.Router();

router.post('/', validateToken, upload, checkFile, createStyleImage);
router.get('/', validateToken, fetchAllStyleImages);
router.get('/:id', validateToken, fetchOneStyleImage);
router.delete('/:id', validateToken, deleteStyleImage);

export default router;
