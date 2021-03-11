import * as express from 'express';
import { ContentImageController } from './controller';
import { uploadFormData } from '../../utils/middlewares/form-data-middleware';
import { checkToken } from '../../utils/middlewares/jwt-validation-middleware';
import { checkFile } from '../../utils/middlewares/file-validation-middleware';
import { catchAsync } from '../../utils/middlewares/exception-handling-middleware';
import { guardRoute } from '../../utils/middlewares/route-guard-middleware';
import { UserRole } from '../../enums/user-role.enum';

const router = express.Router();

const contentImageController = new ContentImageController();

router.post(
  '/',
  checkToken,
  guardRoute([UserRole.User, UserRole.Admin]),
  uploadFormData,
  checkFile,
  catchAsync(
    contentImageController.createOneContentImage.bind(contentImageController)
  )
);
router.get(
  '/',
  checkToken,
  guardRoute([UserRole.User, UserRole.Admin]),
  catchAsync(
    contentImageController.fetchAllContentImages.bind(contentImageController)
  )
);
router.get(
  '/:id',
  checkToken,
  guardRoute([UserRole.User, UserRole.Admin]),
  catchAsync(
    contentImageController.fetchOneContentImage.bind(contentImageController)
  )
);
router.delete(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin]),
  catchAsync(
    contentImageController.deleteOneContentImage.bind(contentImageController)
  )
);

export default router;
