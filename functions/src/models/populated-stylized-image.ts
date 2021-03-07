// Custom imports
import { PopulatedContentImage } from './populated-content-image';
import { PopulatedImage } from './populated-image';
import { PopulatedStyleImage } from './populated-style-image';

export interface PopulatedStylizedImage {
  id?: string;
  contentImage: PopulatedContentImage;
  styleImage: PopulatedStyleImage;
  image: PopulatedImage;
  name: string;
  uid: string | null;
}
