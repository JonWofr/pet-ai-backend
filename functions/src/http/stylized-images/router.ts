// 3rd party imports
import * as express from 'express';

// Custom imports
import { createStylizedImage, fetchAllStylizedImages, fetchOneStylizedImage } from './controller';

const router = express.Router();

router.post('/', createStylizedImage);
router.get('/', fetchAllStylizedImages)
router.get('/:id', fetchOneStylizedImage)

export default router;
