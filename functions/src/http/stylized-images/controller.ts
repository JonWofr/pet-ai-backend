// 3rd party imports
import * as express from 'express';
import * as http from 'http';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sizeOf from 'buffer-image-size';

// Models
import { StylizedImage } from '../../models/stylized-image';
import { PopulatedStylizedImage } from '../../models/populated-stylized-image';
import { PopulatedContentImage } from '../../models/populated-content-image';
import { PopulatedStyleImage } from '../../models/populated-style-image';
import { ContentImage } from '../../models/content-image';
import { StyleImage } from '../../models/style-image';
import { Image } from '../../models/image';

// Custom imports
import {
  contentImagesCollection,
  getPopulatedDocumentData,
} from '../content-images/controller';
import { styleImagesCollection } from '../style-images/controller';
import { createImageDocument } from '../images/controller';
import { User } from '../../models/user';

interface NstModelResponse {
  predictions: { stylizedImagePublicUrl: string }[];
}

const BUCKET_NAME = 'petai-bdd53.appspot.com';
const bucket = admin.storage().bucket(BUCKET_NAME);

const stylizedImagesCollection = admin
  .firestore()
  .collection('stylized-images')
  .withConverter({
    toFirestore: (stylizedImage: StylizedImage) =>
      stylizedImage as admin.firestore.DocumentData,
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as StylizedImage,
  });

export const createStylizedImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { contentImageId, styleImageId, name } = req.body;

    const contentImageDocument = await contentImagesCollection
      .doc(contentImageId)
      .get();
    const styleImageDocument = await styleImagesCollection
      .doc(styleImageId)
      .get();

    if (!contentImageDocument.exists || !styleImageDocument.exists) {
      res.status(400).send('One or both ids are invalid');
    }

    const contentImageDocumentReference = contentImageDocument.ref;
    const styleImageDocumentReference = styleImageDocument.ref;
    const querySnapshot = await stylizedImagesCollection
      .where('contentImage', '==', contentImageDocumentReference)
      .where('styleImage', '==', styleImageDocumentReference)
      .get();

    const populatedContentImage = await getPopulatedDocumentData(
      contentImageDocument,
      ['image', 'author'],
      false
    ) as PopulatedContentImage;

    const populatedStyleImage = await getPopulatedDocumentData(
      styleImageDocument,
      ['image', 'author'],
      false
    ) as PopulatedStyleImage;

    if (querySnapshot.size > 0) {
      const stylizedImageDocument = querySnapshot.docs[0];
      const populatedStylizedImage = await getPopulatedDocumentData(
        stylizedImageDocument,
        ['image'],
        true
      ) as PopulatedStylizedImage;
      populatedStylizedImage.contentImage = populatedContentImage;
      populatedStylizedImage.styleImage = populatedStyleImage;
      res.status(200).send(populatedStylizedImage);
    }

    const stylizedImagePublicUrl = await requestNstModel(
      populatedContentImage.image.publicUrl,
      populatedStyleImage.image.publicUrl
    );

    const stylizedImagePath = getImagePath(stylizedImagePublicUrl);
    const stylizedImagePathParts = stylizedImagePath.split('/');
    const stylizedImageFilename =
      stylizedImagePathParts[stylizedImagePathParts.length - 1];

    const buffer = await bucket.file(stylizedImagePath).download();
    const imageInfo = sizeOf(buffer[0]);

    const imageDocumentReference = await createImageDocument(
      stylizedImagePublicUrl,
      stylizedImageFilename,
      imageInfo.width,
      imageInfo.height,
      buffer.length
    );

    const stylizedImageDocumentReference = await createStylizedImageDocument(
      contentImageDocumentReference,
      styleImageDocumentReference,
      imageDocumentReference,
      name,
      null
    );

    res
      .status(201)
      .send({ stylizedImageId: stylizedImageDocumentReference.id });
  } catch (err) {
    res.status(500).send(err);
  }
};

const requestNstModel = async (
  contentImagePublicUrl: string,
  styleImagePublicUrl: string
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
        styleImagePublicUrl,
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

// Makes an http request. Does only work for a response type of json.
const makeHttpRequest = <T>(
  requestOptions: http.RequestOptions,
  body?: Object
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const request = http.request(requestOptions);

    request.on('response', (response: http.IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      });
      // Error trying to receive the response
      response.on('error', reject);
    });

    // Error trying to send the request
    request.on('error', reject);

    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
};

const getImagePath = (imagePublicUrl: string) => {
  const imagePublicUrlParts = imagePublicUrl.split('/');
  const bucketPartIndex = imagePublicUrlParts.indexOf(BUCKET_NAME);
  const imagePath = imagePublicUrlParts
    .slice(bucketPartIndex + 1, imagePublicUrlParts.length)
    .join('/');
  return imagePath;
};

const createStylizedImageDocument = async (
  contentImage: admin.firestore.DocumentReference<ContentImage>,
  styleImage: admin.firestore.DocumentReference<StyleImage>,
  image: admin.firestore.DocumentReference<Image>,
  name: string,
  author: admin.firestore.DocumentReference<User> | null
) => {
  const stylizedImage: StylizedImage = {
    contentImage,
    styleImage,
    image,
    name,
    author,
  };
  const stylizedImageDocumentReference = await stylizedImagesCollection.add(
    stylizedImage
  );
  return stylizedImageDocumentReference;
};
