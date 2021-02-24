import { Router } from 'express';
import { createImage } from './controller';

const router = Router();

router.post('/', createImage);

export default router;