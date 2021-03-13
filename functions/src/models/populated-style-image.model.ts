import { PopulatedImage } from './populated-image.model';

export interface PopulatedStyleImage {
  id?: string;
  image: PopulatedImage;
  name: string;
  artist: string;
}
