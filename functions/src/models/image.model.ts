import * as admin from 'firebase-admin';

export interface Image {
  publicUrl: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  timestamp: admin.firestore.Timestamp;
}
