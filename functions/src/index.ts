import * as functions from 'firebase-functions';
import app from './http';

export const api = functions.https.onRequest(app);
