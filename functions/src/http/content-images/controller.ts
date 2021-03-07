// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';

// Custom imports
import { createImageDocument } from '../images/controller';
import { populateDocument } from '../../utils/database-helper';
import { stylizedImagesCollection } from '../stylized-images/controller';
import { uploadFileToGoogleCloudStorage } from '../../utils/storage-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';
import { DocumentDoesNotExistException } from '../../utils/exceptions/document-does-not-exist-execption';

// Models
import { Image } from '../../models/image';
import { ContentImage } from '../../models/content-image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { PopulatedContentImage } from '../../models/populated-content-image';

export const contentImagesCollection = admin
  .firestore()
  .collection('content-images')
  .withConverter({
    toFirestore: (contentImage: ContentImage) =>
      contentImage as admin.firestore.DocumentData,
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as ContentImage,
  });

export const createContentImage = catchAsync(
  async (req: MultipartFormdataRequest, res: express.Response) => {
    const { name } = req.body;
    const { filename, mimetype, buffer } = req.files[0];

    const filePath = 'content-images/' + filename;
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
    const contentImage: ContentImage = {
      image: imageDocumentReference,
      name,
      uid: 'dlksjfl',
    };
    const contentImageDocumentReference = await createContentImageDocument(
      contentImage
    );

    const populatedContentImage: PopulatedContentImage = {
      id: contentImageDocumentReference.id,
      ...contentImage,
      image,
    };
    res.status(201).json(populatedContentImage);
  }
);

const createContentImageDocument = async (
  contentImage: ContentImage
): Promise<admin.firestore.DocumentReference<ContentImage>> => {
  const contentImageDocumentReference = await contentImagesCollection.add(
    contentImage
  );
  return contentImageDocumentReference;
};

export const fetchAllContentImages = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const querySnapshot = await contentImagesCollection.get();
    const populatedContentImagesPromises = querySnapshot.docs.map(
      (contentImageDocument) =>
        populateDocument<PopulatedContentImage>(contentImageDocument, true)
    );
    const populatedContentImages = await Promise.all(
      populatedContentImagesPromises
    );
    res.status(200).json(populatedContentImages);
  }
);

export const fetchOneContentImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const contentImageDocument = await contentImagesCollection.doc(id).get();
    const populatedContentImage = await populateDocument<PopulatedContentImage>(
      contentImageDocument,
      true
    );
    res.status(200).json(populatedContentImage);
  }
);

export const deleteContentImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const contentImageDocumentReference = contentImagesCollection.doc(id);
    const contentImageDocument = await contentImageDocumentReference.get();

    if (!contentImageDocument.exists) {
      throw new DocumentDoesNotExistException(
        `The document with id ${contentImageDocument.id} does not exist`,
        404
      );
    }

    // Delete all stylized image documents that reference this one
    const stylizedImageQuerySnaphot = await stylizedImagesCollection
      .where('contentImage', '==', contentImageDocumentReference)
      .get();
    const stylizedImageDeletionsPromises = stylizedImageQuerySnaphot.docs.map(
      (stylizedImageDocument) =>
        stylizedImagesCollection.doc(stylizedImageDocument.id).delete()
    );
    await Promise.all(stylizedImageDeletionsPromises);

    // Delete corresponding document
    await contentImageDocumentReference.delete();

    // Delete the image document that is referenced by this one
    const contentImage = contentImageDocument.data()!;
    await contentImage.image.delete();

    res.status(200).json({ success: true });
    return;
  }
);
