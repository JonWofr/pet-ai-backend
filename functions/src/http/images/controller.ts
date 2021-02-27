// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';

// Models
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { MultipartFormdataFile } from '../../models/multipart-formdata-file';
import { PopulatedImage } from '../../models/populated-image';

// Custom imports
import { populateDocument } from '../content-images/controller';


const allowedMimeTypes = ['image/jpeg'];
const allowedFileExtensions = ['jpg', 'jpeg'];

const BUCKET_NAME = 'petai-bdd53.appspot.com';
const bucket = admin.storage().bucket(BUCKET_NAME);

export const imagesCollection = admin
  .firestore()
  .collection('images')
  // Explicit Type declaration for all documents inside the collection 'images'
  .withConverter<Image>({
    toFirestore: (image: Image) => image as admin.firestore.DocumentData,
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as Image,
  });

export const checkFile = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const files: MultipartFormdataFile[] = (req as MultipartFormdataRequest)
      .files;

    if (files.length !== 1) {
      res.status(400).send('Only one file is allowed for this endpoint');
      return;
    }

    const { filename, mimetype, buffer } = files[0];

    if (!isFilenameValid(filename)) {
      res.status(400).send("The file's filename is missing or invalid");
      return;
    }
    if (!isMimeTypeValid(mimetype)) {
      res.status(400).send("The file's mime-type is missing or invalid");
      return;
    }
    if (buffer.length === 0) {
      res.status(400).send('The file does not contain any data');
      return;
    }
    next();
  } catch (err) {
    res.status(500).send(err);
    return;
  }
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
  try {
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
    const image = {
      publicUrl,
      filename,
      width: imageInfo.width,
      height: imageInfo.height,
      size: buffer.length,
      timestamp: admin.firestore.Timestamp.fromMillis(Date.now())
    }
    const imageDocumentReference = await createImageDocument(image);
    const populatedImage: PopulatedImage = {
      id: imageDocumentReference.id,
      ...image
    }

    res.status(201).send(populatedImage);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
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

export const createImageDocument = async (image: Image): Promise<admin.firestore.DocumentReference<Image>> => {
  const documentReference = await imagesCollection.add(image);
  return documentReference;
};

export const fetchAllImages = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const querySnapshot = await imagesCollection.get();
    const populatedImagesPromises = querySnapshot.docs.map((imageDocument) => populateDocument<PopulatedImage>(imageDocument, true));
    const populatedImages = await Promise.all(populatedImagesPromises);
    res.status(200).send(populatedImages);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};

export const fetchOneImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const imageDocument = await imagesCollection.doc(id).get();
    const populatedImage = await populateDocument<PopulatedImage>(imageDocument, true)
    res.status(200).send(populatedImage);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};
