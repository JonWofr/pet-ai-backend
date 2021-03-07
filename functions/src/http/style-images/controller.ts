// 3rd party imports
import * as sizeOf from 'buffer-image-size';
import * as express from 'express';
import * as admin from 'firebase-admin';

// Custom imports
import { createImageDocument } from '../images/controller';
import { populateDocument } from '../../utils/database-helper';
import { uploadFileToGoogleCloudStorage } from '../../utils/storage-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';

// Models
import { StyleImage } from '../../models/style-image';
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { PopulatedStyleImage } from '../../models/populated-style-image';
import { stylizedImagesCollection } from '../stylized-images/controller';
import { DocumentDoesNotExistException } from '../../utils/exceptions/document-does-not-exist-execption';

export const styleImagesCollection = admin
  .firestore()
  .collection('style-images')
  .withConverter({
    toFirestore: (styleImage: StyleImage) =>
      styleImage as admin.firestore.DocumentData,
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as StyleImage,
  });

export const createStyleImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { name, artist } = req.body;
    const {
      filename,
      mimetype,
      buffer,
    } = (req as MultipartFormdataRequest).files[0];

    const filePath = 'style-images/' + filename;
    const publicUrl = await uploadFileToGoogleCloudStorage(
      filePath,
      mimetype,
      buffer
    );

    const imageInfo = sizeOf(buffer);
    const image: Image = {
      publicUrl,
      filename,
      width: imageInfo.width,
      height: imageInfo.height,
      size: buffer.length,
      timestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
    };
    const imageDocumentReference = await createImageDocument(image);

    const styleImage: StyleImage = {
      image: imageDocumentReference,
      name,
      artist,
      author: null,
    };
    const styleImageDocumentReference = await createStyleImageDocument(
      styleImage
    );

    const populatedStyleImage: PopulatedStyleImage = {
      id: styleImageDocumentReference.id,
      ...styleImage,
      image,
      author: null,
    };
    res.status(201).json(populatedStyleImage);
  }
);

const createStyleImageDocument = async (
  styleImage: StyleImage
): Promise<admin.firestore.DocumentReference<StyleImage>> => {
  const styleImageDocumentReference = await styleImagesCollection.add(
    styleImage
  );
  return styleImageDocumentReference;
};

export const fetchAllStyleImages = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const querySnapshot = await styleImagesCollection.get();
    const populatedStyleImagesPromises = querySnapshot.docs.map(
      (styleImageDocument) =>
        populateDocument<PopulatedStyleImage>(styleImageDocument, true)
    );
    const populatedStyleImages = await Promise.all(
      populatedStyleImagesPromises
    );
    res.status(200).json(populatedStyleImages);
  }
);

export const fetchOneStyleImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const styleImageDocument = await styleImagesCollection.doc(id).get();
    const populatedStyleImage = await populateDocument<PopulatedStyleImage>(
      styleImageDocument,
      true
    );
    res.status(200).json(populatedStyleImage);
  }
);

export const deleteStyleImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const styleImageDocumentReference = styleImagesCollection.doc(id);
    const styleImageDocument = await styleImageDocumentReference.get();

    if (!styleImageDocument.exists) {
      throw new DocumentDoesNotExistException(
        `The document with id ${styleImageDocument.id} does not exist`,
        404
      );
    }

    // Delete all stylized image documents that reference this one
    const stylizedImageQuerySnaphot = await stylizedImagesCollection
      .where('styleImage', '==', styleImageDocumentReference)
      .get();
    const stylizedImageDeletionsPromises = stylizedImageQuerySnaphot.docs.map(
      (stylizedImageDocument) =>
        stylizedImagesCollection.doc(stylizedImageDocument.id).delete()
    );
    await Promise.all(stylizedImageDeletionsPromises);

    // Delete corresponding document
    await styleImageDocumentReference.delete();

    // Delete the image document that is referenced by this one
    const styleImage = styleImageDocument.data()!;
    await styleImage.image.delete();

    res.status(200).json({ success: true });
  }
);
