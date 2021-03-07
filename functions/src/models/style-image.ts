// 3rd party imports
import * as admin from 'firebase-admin';

// Models
import { Image } from './image';

export interface StyleImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  artist: string;
  uid: string | null;
}
