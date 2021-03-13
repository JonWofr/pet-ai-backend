import { PopulatedContentImage } from './populated-content-image.model';
import { PopulatedStyleImage } from './populated-style-image.model';
import { PopulatedStylizedImage } from './populated-stylized-image.model';

export interface PopulatedProductCard {
  contentImage: PopulatedContentImage;
  appliedStyleImages: PopulatedStyleImage[];
  resultingStylizedImages: PopulatedStylizedImage[];
  userId: string;
  name: string;
}
