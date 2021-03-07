// 3rd party imports
import * as express from 'express';
import * as admin from 'firebase-admin';

export interface TokenRequest extends express.Request {
  token: admin.auth.DecodedIdToken;
}
