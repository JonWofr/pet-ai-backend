import { PopulatedImage } from './populated-image';

export interface PopulatedContentImage {
  id?: string;
  image: PopulatedImage;
  name: string;
  userId: string | null;
}
