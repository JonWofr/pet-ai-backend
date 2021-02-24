import * as admin from 'firebase-admin';

export interface User {
  timestamp: admin.firestore.Timestamp;
  lastSeen: admin.firestore.Timestamp
}
