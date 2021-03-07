// 3rd party imports
import * as admin from 'firebase-admin';

// Models
import { Image } from './image';

export interface ContentImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  uid: string | null;
}
