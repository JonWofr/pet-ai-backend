// Models
import { PopulatedImage } from './populated-image';
import { PopulatedUser } from './populated-user';

export interface PopulatedStyleImage {
  id?: string;
  image: PopulatedImage;
  name: string;
  artist: string;
  author: PopulatedUser | null;
}
