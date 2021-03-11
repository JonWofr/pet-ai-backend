import * as express from 'express';
import { UserRole } from '../../enums/user-role.enum';
import { checkToken } from '../../utils/middlewares/jwt-validation-middleware';
import { catchAsync } from '../../utils/middlewares/exception-handling-middleware';
import { guardRoute } from '../../utils/middlewares/route-guard-middleware';
import { StylizedImageController } from './controller';

const router = express.Router();

const stylizedImageController = new StylizedImageController();

router.post(
  '/',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    stylizedImageController.createOneStylizedImage.bind(stylizedImageController)
  )
);
router.get(
  '/',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    stylizedImageController.fetchAllStylizedImages.bind(stylizedImageController)
  )
);
router.get(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    stylizedImageController.fetchOneStylizedImage.bind(stylizedImageController)
  )
);
router.delete(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(
    stylizedImageController.deleteOneStylizedImage.bind(stylizedImageController)
  )
);

export default router;
