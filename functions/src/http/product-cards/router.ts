import * as express from 'express';
import { UserRole } from '../../enums/user-role.enum';
import { catchAsync } from '../../utils/middlewares/exception-handling-middleware';
import { checkToken } from '../../utils/middlewares/jwt-validation-middleware';
import { guardRoute } from '../../utils/middlewares/route-guard-middleware';
import { ProductCardController } from './controller';

const router = express.Router();

const productCardController = new ProductCardController();

router.get(
  '/',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    productCardController.fetchAllProductCards.bind(productCardController)
  )
);
router.get(
  '/:id',
  checkToken,
  guardRoute([UserRole.Admin, UserRole.User]),
  catchAsync(
    productCardController.fetchAllProductCards.bind(productCardController)
  )
);

export default router;
