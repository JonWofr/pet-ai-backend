// Custom imports
import { PopulatedContentImage } from './populated-content-image';
import { PopulatedImage } from './populated-image';
import { PopulatedStyleImage } from './populated-style-image';
import { PopulatedUser } from './populated-user';


export interface PopulatedStylizedImage {
    id?: string;
    contentImage: PopulatedContentImage,
    styleImage: PopulatedStyleImage,
    image: PopulatedImage,
    name: string,
    author: PopulatedUser | null
}