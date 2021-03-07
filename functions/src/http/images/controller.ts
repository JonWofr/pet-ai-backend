// 3rd party imports
import * as express from 'express';
import * as admin from 'firebase-admin';

// Models
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { MultipartFormdataFile } from '../../models/multipart-formdata-file';
import { PopulatedImage } from '../../models/populated-image';

// Custom imports
import { populateDocument } from '../../utils/database-helper';
import { InvalidUploadException } from '../../utils/exceptions/invalid-upload-exception';
import { catchAsync } from '../../utils/exception-handling-middleware';

const allowedMimeTypes = ['image/jpeg'];
const allowedFileExtensions = ['jpg', 'jpeg'];

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
  const files: MultipartFormdataFile[] = (req as MultipartFormdataRequest)
    .files;

  if (files.length !== 1) {
    throw new InvalidUploadException(
      'Only one file is allowed for this endpoint',
      400
    );
  }

  const { filename, mimetype, buffer } = files[0];

  if (!isFilenameValid(filename)) {
    throw new InvalidUploadException(
      "The file's filename is missing or invalid",
      400
    );
  }
  if (!isMimeTypeValid(mimetype)) {
    throw new InvalidUploadException(
      "The file's mime-type is missing or invalid",
      400
    );
  }
  if (buffer.length === 0) {
    throw new InvalidUploadException('The file does not contain any data', 400);
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

export const createImageDocument = async (
  image: Image
): Promise<admin.firestore.DocumentReference<Image>> => {
  const documentReference = await imagesCollection.add(image);
  return documentReference;
};

export const fetchAllImages = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const querySnapshot = await imagesCollection.get();
    const populatedImagesPromises = querySnapshot.docs.map((imageDocument) =>
      populateDocument<PopulatedImage>(imageDocument, true)
    );
    const populatedImages = await Promise.all(populatedImagesPromises);
    res.status(200).send(populatedImages);
  }
);

export const fetchOneImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const imageDocument = await imagesCollection.doc(id).get();
    const populatedImage = await populateDocument<PopulatedImage>(
      imageDocument,
      true
    );
    res.status(200).send(populatedImage);
  }
);
