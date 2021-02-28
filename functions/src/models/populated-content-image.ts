// Models
import { Image } from './image';
import { User } from './user';

export interface PopulatedContentImage {
  id?: string;
  image: Image;
  name: string;
  author: User | null;
}
