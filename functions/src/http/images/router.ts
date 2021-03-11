import * as express from 'express';
import { catchAsync } from '../../utils/middlewares/exception-handling-middleware';
import { checkToken } from '../../utils/middlewares/jwt-validation-middleware';
import { uploadFormData } from '../../utils/middlewares/form-data-middleware';
import { ImageController } from './controller';
import { guardRoute } from '../../utils/middlewares/route-guard-middleware';
import { UserRole } from '../../enums/user-role.enum';

const imageController = new ImageController();

const router = express.Router();

router.post(
  '/',
  checkToken,
  guardRoute([UserRole.Admin]),
  uploadFormData,
  catchAsync(imageController.createOneImage.bind(imageController))
);
router.get(
  '/',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(imageController.fetchAllImages.bind(imageController))
);
router.get(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(imageController.fetchOneImage.bind(imageController))
);
router.delete(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(imageController.deleteOneImage.bind(imageController))
);

export default router;
