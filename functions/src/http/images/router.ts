import * as express from 'express';
import { fetchAllImages, fetchOneImage } from './controller';

const router = express.Router();

router.get('/', fetchAllImages);
router.get('/:id', fetchOneImage);

export default router;
