// 3rd party imports
import * as admin from 'firebase-admin';

// Models
import { Image } from './image';
import { User } from './user';

export interface ContentImage {
  image: admin.firestore.DocumentReference<Image>;
  name: string;
  author: admin.firestore.DocumentReference<User> | null;
}
