// 3rd party imports
import * as express from 'express';

// Custom imports
import { createStylizedImage } from './controller';

const router = express.Router();

router.post('/', createStylizedImage);

export default router;
