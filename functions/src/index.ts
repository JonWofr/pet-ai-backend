// 3rd party imports
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'

// Has to be initialized as soon as possible because user code relies on it
admin.initializeApp();

// Custom imports
import app from './http';


export const api = functions.https.onRequest(app);