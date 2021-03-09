import * as sizeOf from 'buffer-image-size';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { createImageDocument } from '../images/controller';
import {
  checkDocument,
  populateDocument,
  processDocument,
} from '../../utils/database-helper';
import { uploadFileToGoogleCloudStorage } from '../../utils/storage-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';
import { StyleImage } from '../../models/style-image';
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { PopulatedStyleImage } from '../../models/populated-style-image';
import { stylizedImagesCollection } from '../stylized-images/controller';
import { TokenRequest } from '../../models/token-request';

export const styleImagesCollection = admin
  .firestore()
  .collection('style-images')
  .withConverter({
    toFirestore: (styleImage: StyleImage) =>
      styleImage as admin.firestore.DocumentData,
    fromFirestore: (document: admin.firestore.QueryDocumentSnapshot) =>
      document.data() as StyleImage,
  });

export const createStyleImage = catchAsync(
  async (req: MultipartFormdataRequest, res: express.Response) => {
    const { name, artist } = req.body;
    const { filename, mimetype, buffer } = req.files[0];
    const { uid } = req.token;

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
      uid,
    };
    const styleImageDocumentReference = await createStyleImageDocument(
      styleImage
    );

    const populatedStyleImage: PopulatedStyleImage = {
      id: styleImageDocumentReference.id,
      ...styleImage,
      image,
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
  async (req: TokenRequest, res: express.Response) => {
    const { uid } = req.token;
    const querySnapshot = await styleImagesCollection
      .where('uid', 'in', [uid, null])
      .get();
    const populatedStyleImagesPromises = querySnapshot.docs.map(
      (styleImageDocument) =>
        populateDocument<PopulatedStyleImage>(styleImageDocument, true, true)
    );
    const populatedStyleImages = await Promise.all(
      populatedStyleImagesPromises
    );
    res.status(200).json(populatedStyleImages);
  }
);

export const fetchOneStyleImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid } = req.token;
    const styleImageDocument = await styleImagesCollection.doc(id).get();
    const populatedStyleImage = await processDocument<PopulatedStyleImage>(
      styleImageDocument,
      true,
      true,
      uid
    );
    res.status(200).json(populatedStyleImage);
  }
);

export const deleteStyleImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid } = req.token;
    const styleImageDocumentReference = styleImagesCollection.doc(id);
    const styleImageDocument = await styleImageDocumentReference.get();
    checkDocument(styleImageDocument, uid);

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
