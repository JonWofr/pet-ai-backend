import * as express from 'express';
import { StyleImageController } from './controller';
import { uploadFormData } from '../../utils/middlewares/form-data-middleware';
import { checkFile } from '../../utils/middlewares/file-validation-middleware';
import { catchAsync } from '../../utils/middlewares/exception-handling-middleware';
import { checkToken } from '../../utils/middlewares/jwt-validation-middleware';
import { guardRoute } from '../../utils/middlewares/route-guard-middleware';
import { UserRole } from '../../enums/user-role.enum';

const router = express.Router();

const styleImageController = new StyleImageController();

router.post(
  '/',
  checkToken,
  guardRoute([UserRole.Admin]),
  uploadFormData,
  checkFile,
  catchAsync(
    styleImageController.createOneStyleImage.bind(styleImageController)
  )
);
router.get(
  '/',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    styleImageController.fetchAllStyleImages.bind(styleImageController)
  )
);
router.get(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(styleImageController.fetchOneStyleImage.bind(styleImageController))
);
router.delete(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(
    styleImageController.deleteOneStyleImage.bind(styleImageController)
  )
);

export default router;
