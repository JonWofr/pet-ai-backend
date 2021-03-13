import * as admin from 'firebase-admin';
import { Image } from './image.model';

export interface ContentImage {
  image: admin.firestore.DocumentReference<Image>;
  userId: string;
}
