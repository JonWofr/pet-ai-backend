// 3rd party imports
import * as admin from 'firebase-admin';

// Custom imports
import { ContentImage } from './content-image';
import { Image } from './image';
import { StyleImage } from './style-image';

export interface StylizedImage {
  contentImage: admin.firestore.DocumentReference<ContentImage>;
  styleImage: admin.firestore.DocumentReference<StyleImage>;
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  uid: string | null;
}
