import * as express from 'express';
import * as http from 'http';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sizeOf from 'buffer-image-size';
import { StylizedImage } from '../../models/stylized-image';
import { PopulatedStylizedImage } from '../../models/populated-stylized-image';
import { PopulatedContentImage } from '../../models/populated-content-image';
import { PopulatedStyleImage } from '../../models/populated-style-image';
import { Image } from '../../models/image';
import { contentImagesCollection } from '../content-images/controller';
import { styleImagesCollection } from '../style-images/controller';
import { createImageDocument } from '../images/controller';
import {
  checkDocument,
  populateDocument,
  processDocument,
} from '../../utils/database-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';
import { makeHttpRequest } from '../../utils/http-helper';
import { TokenRequest } from '../../models/token-request';

interface NstModelResponse {
  predictions: { stylizedImagePublicUrl: string }[];
}

const BUCKET_NAME = 'petai-bdd53.appspot.com';
const bucket = admin.storage().bucket(BUCKET_NAME);

export const stylizedImagesCollection = admin
  .firestore()
  .collection('stylized-images')
  .withConverter({
    toFirestore: (stylizedImage: StylizedImage) =>
      stylizedImage as admin.firestore.DocumentData,
    fromFirestore: (document: admin.firestore.QueryDocumentSnapshot) =>
      document.data() as StylizedImage,
  });

export const createStylizedImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { contentImageId, styleImageId, name } = req.body;
    const { uid: userId } = req.token;

    const contentImageDocumentPromise = contentImagesCollection
      .doc(contentImageId)
      .get();
    const styleImageDocumentPromise = styleImagesCollection
      .doc(styleImageId)
      .get();

    const [contentImageDocument, styleImageDocument] = await Promise.all([
      contentImageDocumentPromise,
      styleImageDocumentPromise,
    ]);

    checkDocument(contentImageDocument, userId);
    checkDocument(styleImageDocument, userId);

    const contentImageDocumentReference = contentImageDocument.ref;
    const styleImageDocumentReference = styleImageDocument.ref;
    const querySnapshot = await stylizedImagesCollection
      .where('contentImage', '==', contentImageDocumentReference)
      .where('styleImage', '==', styleImageDocumentReference)
      .get();

    const populatedContentImagePromise = populateDocument<PopulatedContentImage>(
      contentImageDocument,
      false,
      true
    );
    const populatedStyleImagePromise = populateDocument<PopulatedStyleImage>(
      styleImageDocument,
      false,
      true
    );

    const [populatedContentImage, populatedStyleImage] = await Promise.all([
      populatedContentImagePromise,
      populatedStyleImagePromise,
    ]);

    let populatedStylizedImage: PopulatedStylizedImage | undefined;
    if (querySnapshot.size > 0) {
      const stylizedImageDocument = querySnapshot.docs[0];
      populatedStylizedImage = await processDocument<PopulatedStylizedImage>(
        stylizedImageDocument,
        true,
        true,
        userId
      );

      res.status(200).json(populatedStylizedImage);
      return;
    }

    const stylizedImagePublicUrl = await requestNstModel(
      populatedContentImage.image.publicUrl,
      populatedStyleImage.name
    );

    const stylizedImagePath = getImagePath(stylizedImagePublicUrl);
    const stylizedImagePathParts = stylizedImagePath.split('/');
    const stylizedImageFilename =
      stylizedImagePathParts[stylizedImagePathParts.length - 1];

    const buffer = await bucket.file(stylizedImagePath).download();
    const imageInfo = sizeOf(buffer[0]);

    const image: Image = {
      publicUrl: stylizedImagePublicUrl,
      filename: stylizedImageFilename,
      width: imageInfo.width,
      height: imageInfo.height,
      size: buffer.length,
      timestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
    };
    const imageDocumentReference = await createImageDocument(image);

    const stylizedImage: StylizedImage = {
      contentImage: contentImageDocumentReference,
      styleImage: styleImageDocumentReference,
      image: imageDocumentReference,
      name,
      userId,
    };
    const stylizedImageDocumentReference = await createStylizedImageDocument(
      stylizedImage
    );

    populatedStylizedImage = {
      id: stylizedImageDocumentReference.id,
      ...stylizedImage,
      contentImage: populatedContentImage,
      styleImage: populatedStyleImage,
      image,
    };

    res.status(201).json(populatedStylizedImage);
  }
);

const requestNstModel = async (
  contentImagePublicUrl: string,
  styleImageName: string
) => {
  const nstModelRequestOptions: http.RequestOptions = {
    method: 'POST',
    host: functions.config().nstmodel.host,
    port: functions.config().nstmodel.port,
    path: '/predict',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const nstModelRequestBody = {
    instances: [
      {
        contentImagePublicUrl,
        styleImageName,
      },
    ],
  };

  const nstModelResponse = await makeHttpRequest<NstModelResponse>(
    nstModelRequestOptions,
    nstModelRequestBody
  );
  const { stylizedImagePublicUrl } = nstModelResponse.predictions[0];
  return stylizedImagePublicUrl;
};

const getImagePath = (imagePublicUrl: string) => {
  const imagePublicUrlParts = imagePublicUrl.split('/');
  const bucketPartIndex = imagePublicUrlParts.indexOf(BUCKET_NAME);
  const imagePath = imagePublicUrlParts
    .slice(bucketPartIndex + 1, imagePublicUrlParts.length)
    .join('/');
  return imagePath;
};

const createStylizedImageDocument = async (stylizedImage: StylizedImage) => {
  const stylizedImageDocumentReference = await stylizedImagesCollection.add(
    stylizedImage
  );
  return stylizedImageDocumentReference;
};

export const fetchAllStylizedImages = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { uid: userId } = req.token;
    const querySnapshot = await stylizedImagesCollection
      .where('userId', 'in', [userId, null])
      .get();
    const populatedStylizedImagesPromises = querySnapshot.docs.map(
      (stylizedImageDocument) =>
        populateDocument<PopulatedStylizedImage>(
          stylizedImageDocument,
          true,
          true
        )
    );
    const populatedStylizedImages = await Promise.all(
      populatedStylizedImagesPromises
    );
    res.status(200).json(populatedStylizedImages);
  }
);

export const fetchOneStylizedImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid: userId } = req.token;
    const stylizedImageDocument = await stylizedImagesCollection.doc(id).get();
    const populatedStylizedImage = await processDocument<PopulatedStylizedImage>(
      stylizedImageDocument,
      true,
      true,
      userId
    );
    res.status(200).json(populatedStylizedImage);
  }
);

export const deleteStylizedImage = catchAsync(
  async (req: TokenRequest, res: express.Response) => {
    const { id } = req.params;
    const { uid: userId } = req.token;
    const stylizedImageDocumentReference = stylizedImagesCollection.doc(id);
    const stylizedImageDocument = await stylizedImageDocumentReference.get();
    checkDocument(stylizedImageDocument, userId);
    await stylizedImageDocumentReference.delete();
    res.status(200).json({ success: true });
  }
);
