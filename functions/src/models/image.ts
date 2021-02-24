import * as admin from 'firebase-admin';

export interface Image {
  publicUrl: string;
  filename: string;
  width: number;
  height: number;
  depth: number;
  type: string;
  timestamp: admin.firestore.Timestamp;
  size: number;
}
