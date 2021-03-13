import { PopulatedContentImage } from './populated-content-image.model';
import { PopulatedImage } from './populated-image.model';
import { PopulatedStyleImage } from './populated-style-image.model';

export interface PopulatedStylizedImage {
  id?: string;
  contentImage: PopulatedContentImage;
  styleImage: PopulatedStyleImage;
  image: PopulatedImage;
  userId: string;
}
