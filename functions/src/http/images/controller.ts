import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { Image } from '../../models/image';
import * as sizeOf from 'buffer-image-size';

const BUCKET_NAME = 'petai-bdd53.appspot.com';

admin.initializeApp();

const permittedImageTypes = ['content', 'style'];
const permittedFileExtensions = ['jpg', 'jpeg'];
const bucket = admin.storage().bucket(BUCKET_NAME);
const imagesCollection = admin.firestore().collection('images');

// Firebase functions include body-parser per default. Depending on the content-type of the request the body gets processed differently. For images this means that they have already been uploaded in its entirety at the moment this function is fired.
export const createImage = async (req: Request, res: Response) => {
  const filename = req.query['filename'];
  const imageType = req.query['image_type']


  if (filename === undefined || imageType === undefined) {
    res.status(400).send('Missing query string information');
  }
  const contentType = req.get('Content-Type');
  if (contentType === undefined || contentType !== 'image/jpeg') {
    res
      .status(400)
      .send('Missing or invalid Content-Type (only image/jpeg is allowed)');
  }
  const filenameParts = (filename as string).split('.');
  if (filenameParts.length < 2) {
    res.status(400).send('Invalid filename');
  }
  const fileExtension = filenameParts[filenameParts.length - 1];
  if (!isPermittedFileExtension(fileExtension)) {
    res.status(400).send('File extension is not permitted');
  }
  if (!isPermittedImageType(imageType as string)) {
    res.status(400).send('Invalid imageType query param');
  }

  try {
    const imageData = req.body;
    const publicUrl = await uploadImageToGoogleCloudStorage(
      filename as string,
      contentType as string,
      imageType as string,
      imageData
    );
    const imageInfo = sizeOf(imageData);
    await createImageDocument(
      publicUrl,
      filename as string,
      imageInfo.width,
      imageInfo.height,
      imageData.length
    );
    res.status(201).send({ publicUrl });
  } catch (error) {
    res.status(500).send(error);
  }
};

const isPermittedFileExtension = (fileExtension: string): boolean => {
  return permittedFileExtensions.includes(fileExtension.toLowerCase());
};

const isPermittedImageType = (imageType: string): boolean => {
  return permittedImageTypes.includes(imageType);
};

const uploadImageToGoogleCloudStorage = (
  filename: string,
  contentType: string,
  imageType: string,
  imageData: Buffer
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filepath =
      imageType === 'content'
        ? `content-images/${filename}`
        : `style-images/${filename}`;
    const imageFile = bucket.file(filepath);
    const imageWritableStream = imageFile.createWriteStream({
      contentType,
      resumable: false,
    });
    imageWritableStream.on('error', reject);
    imageWritableStream.on('finish', async () => {
      const publicUrl = `https://storage.gooleapis.com/${BUCKET_NAME}/${filepath}`;
      resolve(publicUrl);
    });
    imageWritableStream.write(imageData);
    imageWritableStream.end();
  });
};

const createImageDocument = async (
  publicUrl: string,
  filename: string,
  width: number,
  height: number,
  size: number
): Promise<string> => {
  const imageDocument: Image = {
    publicUrl,
    filename,
    width,
    height,
    size,
    timestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
  };
  const documentReference = await imagesCollection.add(imageDocument);
  return documentReference.id;
};
