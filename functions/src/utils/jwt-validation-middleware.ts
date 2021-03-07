import * as express from 'express';
import * as admin from 'firebase-admin';

export const validateToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authorizationHeader = req.header('Authorization');
  if (!authorizationHeader) {
    res.status(400).send('Missing authorization token');
    return;
  }
  const authorizationHeaderParts = authorizationHeader.split(' ');
  if (authorizationHeaderParts.length < 2) {
    res.status(400).send('Invalid authorization header');
  }
  const idToken = authorizationHeaderParts[1];
  const decodedIdToken = await admin.auth().verifyIdToken(idToken);
  console.log(decodedIdToken);
  next();
};
