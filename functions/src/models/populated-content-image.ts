// Models
import { PopulatedImage } from './populated-image';
import { PopulatedUser } from './populated-user';

export interface PopulatedContentImage {
  id?: string;
  image: PopulatedImage;
  name: string;
  author: PopulatedUser | null;
}
