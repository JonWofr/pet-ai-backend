import { PopulatedImage } from './populated-image.model';

export interface PopulatedContentImage {
  id?: string;
  image: PopulatedImage;
  userId: string;
}
