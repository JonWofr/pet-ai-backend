// Custom imports
import { Image } from './image';
import { PopulatedContentImage } from './populated-content-image';
import { PopulatedStyleImage } from './populated-style-image';
import { User } from './user';


export interface PopulatedStylizedImage {
    id?: string;
    contentImage: PopulatedContentImage,
    styleImage: PopulatedStyleImage,
    image: Image,
    name: string,
    author: User | null
}