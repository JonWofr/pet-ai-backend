import * as express from 'express';
import * as admin from 'firebase-admin';
import { AuthenticationException } from './exceptions/authentication-exception';
import { catchAsync } from '../utils/exception-handling-middleware';

export const validateToken = catchAsync(
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const authorizationHeader = req.header('Authorization');
    if (!authorizationHeader) {
      throw new AuthenticationException('Missing authorization token', 401);
    }
    const authorizationHeaderParts = authorizationHeader.split(' ');
    if (authorizationHeaderParts.length < 2) {
      throw new AuthenticationException('Invalid authorization token', 401);
    }
    const idToken = authorizationHeaderParts[1];
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      (req as any).token = decodedIdToken;
      next();
    } catch (error) {
      throw new AuthenticationException(error.message, 401);
    }
  }
);
