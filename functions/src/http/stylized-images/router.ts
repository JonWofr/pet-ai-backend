// 3rd party imports
import * as express from 'express';

// Custom imports
import { createStylizedImage, fetchAllStylizedImages, fetchOneStylizedImage, deleteStylizedImage } from './controller';

const router = express.Router();

router.post('/', createStylizedImage);
router.get('/', fetchAllStylizedImages)
router.get('/:id', fetchOneStylizedImage)
router.delete('/:id', deleteStylizedImage)

export default router;
