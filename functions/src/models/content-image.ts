import { Image } from './image';
import { User } from './user';
import { DocumentReference } from '@google-cloud/firestore'

export interface ContentImage {
  image: DocumentReference<Image>;
  name: string;
  author: DocumentReference<User> | null;
}
