// 3rd party imports
import * as firestore from '@google-cloud/firestore'

// Custom imports
import { Image } from "./image";
import { User } from "./user";


export interface StyleImage {
    image: firestore.DocumentReference<Image>,
    name: string,
    artist: string,
    author: firestore.DocumentReference<User> | null
}