import * as admin from 'firebase-admin';
import { Image } from './image';

export interface ContentImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  uid: string | null;
}
