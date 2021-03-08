import * as express from 'express';
import { validateToken } from '../../utils/jwt-validation-middleware';
import {
  createStylizedImage,
  fetchAllStylizedImages,
  fetchOneStylizedImage,
  deleteStylizedImage,
} from './controller';

const router = express.Router();

router.post('/', validateToken, createStylizedImage);
router.get('/', validateToken, fetchAllStylizedImages);
router.get('/:id', validateToken, fetchOneStylizedImage);
router.delete('/:id', validateToken, deleteStylizedImage);

export default router;
