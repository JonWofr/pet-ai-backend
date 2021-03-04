// 3rd party imports
import * as express from 'express';

// Custom imports
import { fetchAllImages, fetchOneImage } from './controller';

const router = express.Router();

router.get('/', fetchAllImages)
router.get('/:id', fetchOneImage)

export default router;
