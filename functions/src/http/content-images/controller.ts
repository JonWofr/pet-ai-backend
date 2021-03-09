import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';
import { createImageDocument } from '../images/controller';
import {
  checkDocument,
  populateDocument,
  processDocument,
} from '../../utils/database-helper';
import { stylizedImagesCollection } from '../stylized-images/controller';
import { uploadFileToGoogleCloudStorage } from '../../utils/storage-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';
import { Image } from '../../models/image';
import { ContentImage } from '../../models/content-image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { PopulatedContentImage } from '../../models/populated-content-image';
import { TokenRequest } from '../../models/token-request';

export const contentImagesCollection = admin
  .firestore()
  .collection('content-images')
  .withConverter({
    toFirestore: (contentImage: ContentImage) =>
      contentImage as admin.firestore.DocumentData,
    fromFirestore: (document: admin.firestore.QueryDocumentSnapshot) =>
      document.data() as ContentImage,
  });

export const createContentImage = catchAsync(
  async (req: MultipartFormdataRequest, res: express.Response) => {
    const { name } = req.body;
    const { filename, mimetype, buffer } = req.files[0];
    const { uid: userId } = req.token;

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
      userId: userId,
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
  async (req: TokenRequest, res: express.Response) => {
    const { uid: userId } = req.token;
    const querySnapshot = await contentImagesCollection
      .where('userId', 'in', [userId, null])
      .get();
    const populatedContentImagesPromises = querySnapshot.docs.map(
      (contentImageDocument) =>
        populateDocument<PopulatedContentImage>(
          contentImageDocument,
          true,
          true
        )
    );
    const populatedContentImages = await Promise.all(
      populatedContentImagesPromises
    );
    res.status(200).json(populatedContentImages);
  }
);

export const fetchOneContentImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid: userId } = req.token;
    const contentImageDocument = await contentImagesCollection.doc(id).get();
    const populatedContentImage = await processDocument<PopulatedContentImage>(
      contentImageDocument,
      true,
      true,
      userId
    );
    res.status(200).json(populatedContentImage);
  }
);

export const deleteContentImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid: userId } = req.token;
    const contentImageDocumentReference = contentImagesCollection.doc(id);
    const contentImageDocument = await contentImageDocumentReference.get();
    checkDocument(contentImageDocument, userId);

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
