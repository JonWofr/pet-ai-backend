import * as admin from 'firebase-admin';
import { ContentImage } from './content-image.model';
import { Image } from './image.model';
import { StyleImage } from './style-image.model';

export interface StylizedImage {
  contentImage: admin.firestore.DocumentReference<ContentImage>;
  styleImage: admin.firestore.DocumentReference<StyleImage>;
  image: admin.firestore.DocumentReference<Image>;
  userId: string;
}
