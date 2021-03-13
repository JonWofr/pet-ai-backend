import * as admin from 'firebase-admin';
import { ContentImage } from './content-image.model';
import { StyleImage } from './style-image.model';
import { StylizedImage } from './stylized-image.model';

export interface ProductCard {
  contentImage: admin.firestore.DocumentReference<ContentImage>;
  appliedStyleImages: admin.firestore.DocumentReference<StyleImage>[];
  resultingStylizedImages: admin.firestore.DocumentReference<StylizedImage>[];
  userId: string;
  name: string;
}
