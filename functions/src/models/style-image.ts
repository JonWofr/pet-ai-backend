import * as admin from 'firebase-admin';
import { Image } from './image';

export interface StyleImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  artist: string;
  userId: string | null;
}
