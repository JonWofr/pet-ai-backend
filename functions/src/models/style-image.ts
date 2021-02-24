import { Image } from "./image";
import { User } from "./user";

export interface StyleImage {
    image: Image,
    name: string,
    artist: string,
    author: User
}