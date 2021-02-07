import { Image } from './image';
import { User } from './user';

export interface ContentImage {
  image: Image;
  name: string;
  author: User;
}
