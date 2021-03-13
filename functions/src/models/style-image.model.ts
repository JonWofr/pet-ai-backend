import * as admin from 'firebase-admin';
import { Image } from './image.model';

export interface StyleImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  artist: string;
}
