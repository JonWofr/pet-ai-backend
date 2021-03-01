// 3rd party imports
import * as admin from 'firebase-admin';

export interface PopulatedUser {
  id?: string;
  timestamp: admin.firestore.Timestamp;
  lastSeen: admin.firestore.Timestamp;
}
