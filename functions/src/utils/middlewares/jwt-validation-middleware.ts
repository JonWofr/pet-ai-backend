import * as express from 'express';
import * as admin from 'firebase-admin';
import { AuthenticationException } from '../exceptions/authentication-exception';
import { catchAsync } from './exception-handling-middleware';
import { TokenRequest } from '../../models/token-request';

export const checkToken = catchAsync(
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const authorizationHeader = req.header('Authorization');
    if (!authorizationHeader) {
      throw new AuthenticationException('Missing Authorization header', 401);
    }
    const authorizationHeaderParts = authorizationHeader.split(' ');
    if (authorizationHeaderParts.length !== 2) {
      throw new AuthenticationException(
        'Invalid Authorization header syntax. Bearer scheme should be used.',
        401
      );
    }
    const idToken = authorizationHeaderParts[1];
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      (req as TokenRequest).token = decodedIdToken;
      next();
    } catch (error) {
      throw new AuthenticationException(error.message, 401);
    }
  }
);
