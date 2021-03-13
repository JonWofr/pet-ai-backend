import * as express from 'express';
import { UserRole } from '../../enums/user-role.enum';
import { TokenRequest } from '../../models/token-request.model';
import { AuthorizationException } from '../exceptions/authorization-exception';

export const guardRoute = (permittedUserRoles: UserRole[]) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const { role: userRole = UserRole.User } = (req as TokenRequest).token;
    if (!permittedUserRoles.includes(userRole)) {
      throw new AuthorizationException(
        `You are not allowed to use this route with a user role of ${userRole}`,
        403
      );
    }
    next();
  };
};
