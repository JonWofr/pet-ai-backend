import { PopulatedImage } from './populated-image';

export interface PopulatedStyleImage {
  id?: string;
  image: PopulatedImage;
  name: string;
  artist: string;
  uid: string | null;
}
