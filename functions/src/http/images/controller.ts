// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as firestore from '@google-cloud/firestore';
import * as admin from 'firebase-admin';

// Models
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { MultipartFormdataFile } from '../../models/multipart-formdata-file';

const BUCKET_NAME = 'petai-bdd53.appspot.com';

const allowedMimeTypes = ['image/jpeg'];
const allowedFileExtensions = ['jpg', 'jpeg'];

const bucket = admin.storage().bucket(BUCKET_NAME);
export const imagesCollection = admin
  .firestore()
  .collection('images')
  // Explicit Type declaration for all documents inside the collection 'images'
  .withConverter<Image>({
    toFirestore: (image: Image) => image as firestore.DocumentData,
    fromFirestore: (documentData: firestore.DocumentData) =>
      documentData as Image,
  });

export const checkFile = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const files: MultipartFormdataFile[] = (req as MultipartFormdataRequest)
    .files;

  if (files.length !== 1) {
    res.status(400).send('Only one file is allowed for this endpoint');
  }

  const { filename, mimetype, buffer } = files[0];

  if (!isFilenameValid(filename)) {
    res.status(400).send("The file's filename is missing or invalid");
  }
  if (!isMimeTypeValid(mimetype)) {
    res.status(400).send("The file's mime-type is missing or invalid");
  }
  if (buffer.length === 0) {
    res.status(400).send('The file does not contain any data');
  }
  next();
};

export const isFilenameValid = (filename?: string): boolean => {
  if (filename === undefined) {
    return false;
  }
  const filenameParts = filename.split('.');
  if (filenameParts.length < 2) {
    return false;
  }
  const fileExtension = filenameParts[filenameParts.length - 1];
  if (!isFileExtensionAllowed(fileExtension)) {
    return false;
  }
  return true;
};

const isFileExtensionAllowed = (fileExtension: string): boolean => {
  // To lower case to ensure that e.g. .JPG and .jpg extensions are handled the same
  return allowedFileExtensions.includes(fileExtension.toLowerCase());
};

export const isMimeTypeValid = (mimeType?: string): boolean => {
  return mimeType !== undefined && isMimeTypeAllowed(mimeType);
};

const isMimeTypeAllowed = (mimeType: string): boolean => {
  return allowedMimeTypes.includes(mimeType);
};

export const createImage = async (
  req: express.Request,
  res: express.Response
) => {
  const {
    filename,
    mimetype,
    buffer,
  } = (req as MultipartFormdataRequest).files[0];

  const publicUrl = await uploadImageToGoogleCloudStorage(
    filename,
    mimetype,
    buffer
  );

  const imageInfo = sizeOf(buffer);
  const imageDocumentReference = await createImageDocument(
    publicUrl,
    filename,
    imageInfo.width,
    imageInfo.height,
    buffer.length
  );

  res.status(201).send({ imageId: imageDocumentReference.id });
};

export const uploadImageToGoogleCloudStorage = (
  filename: string,
  contentType: string,
  buffer: Buffer
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const imageFile = bucket.file(filename);
    const imageWritableStream = imageFile.createWriteStream({
      contentType,
      resumable: false,
    });
    imageWritableStream.on('error', reject);
    imageWritableStream.on('finish', () => {
      const publicUrl = `https://storage.gooleapis.com/${BUCKET_NAME}/${filename}`;
      resolve(publicUrl);
    });
    imageWritableStream.write(buffer);
    imageWritableStream.end();
  });
};

export const createImageDocument = async (
  publicUrl: string,
  filename: string,
  width: number,
  height: number,
  size: number
): Promise<firestore.DocumentReference<Image>> => {
  const image: Image = {
    publicUrl,
    filename,
    width,
    height,
    size,
    timestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
  };
  const documentReference = await imagesCollection.add(image);
  return documentReference;
};
