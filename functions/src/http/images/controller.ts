import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { Image } from '../../models/image';
import * as sizeOf from 'buffer-image-size';

enum ImageType {
  Png = 'image/png',
  Jpeg = 'image/jpeg',
}

admin.initializeApp({
  credential: admin.credential.cert(
    'C:/Users/jonas/Documents/git-projects/petai-backend/petai-bdd53-firebase-adminsdk-omci2-91835c6ac7.json'
  ),
  storageBucket: 'petai-bdd53.appspot.com/',
});

const bucket = admin.storage().bucket();
const imagesCollection = admin.firestore().collection('images');

// Firebase functions include body-parser per default. Depending on the content-type of the request the body gets processed differently. For images this means that they have already been uploaded in its entirety at the moment this function is fired.
export const createImage = async (req: Request, res: Response) => {
  const { filename } = req.query;
  const imageType = req.get('Content-Type');

  if (filename === undefined) {
    res
      .status(400)
      .send('The filename of the image has to be sent within the query params');
  }

  if (doesSupportImageType(imageType)) {
    try {
      const imageData = req.body;
      await uploadImageToGoogleCloudStorage(
        filename as string,
        imageType as string,
        imageData
      );
      const imageInfo = sizeOf(imageData);
      const id = await createImageDocument(
        filename as string,
        imageInfo.width,
        imageInfo.height,
        imageType as string,
        imageData.length
      );
      res.status(201).send({ id });
    } catch (error) {
      res.status(500).send(error);
    }
  } else {
    res.status(400).send(`Image of type ${imageType} is not supported!`);
  }
};

const doesSupportImageType = (type?: string): boolean => {
  return type === ImageType.Jpeg || type === ImageType.Png;
};

const uploadImageToGoogleCloudStorage = (
  filename: string,
  imageType: string,
  imageData: Buffer
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const imageFile = bucket.file(`${filename}`);
    const imageWritableStream = imageFile.createWriteStream({
      contentType: imageType,
      resumable: false,
    });
    imageWritableStream.on('error', reject);
    imageWritableStream.on('finish', resolve);
    imageWritableStream.write(imageData);
    imageWritableStream.end();
  });
};

const createImageDocument = async (
  filename: string,
  width: number,
  height: number,
  type: string,
  size: number
): Promise<string> => {
  const imageDocument: Image = {
    publicUrl: `https://storage.googleapis.com/${bucket.name}/${filename}`,
    filename,
    width,
    height,
    depth: type === ImageType.Png ? 4 : 3,
    type,
    timestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
    size,
  };
  const documentReference = await imagesCollection.add(imageDocument);
  return documentReference.id;
};
