// Models
import { Image } from './image';
import { User } from './user';

export interface PopulatedStyleImage {
  id?: string;
  image: Image;
  name: string;
  artist: string;
  author: User | null;
}
