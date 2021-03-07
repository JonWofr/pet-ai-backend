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
import { Image } from '../../models/image';

// Custom imports
import { contentImagesCollection } from '../content-images/controller';
import { styleImagesCollection } from '../style-images/controller';
import { createImageDocument } from '../images/controller';
import { populateDocument } from '../../utils/database-helper';
import { catchAsync } from '../../utils/exception-handling-middleware';
import { DocumentDoesNotExistException } from '../../utils/exceptions/document-does-not-exist-execption';

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
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as StylizedImage,
  });

export const createStylizedImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { contentImageId, styleImageId, name } = req.body;

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

    if (!contentImageDocument.exists) {
      throw new DocumentDoesNotExistException(
        `The document with id ${contentImageDocument.id} does not exist`,
        404
      );
    } else if (!styleImageDocument.exists) {
      throw new DocumentDoesNotExistException(
        `The document with id ${styleImageDocument.id} does not exist`,
        404
      );
    }

    const contentImageDocumentReference = contentImageDocument.ref;
    const styleImageDocumentReference = styleImageDocument.ref;
    const querySnapshot = await stylizedImagesCollection
      .where('contentImage', '==', contentImageDocumentReference)
      .where('styleImage', '==', styleImageDocumentReference)
      .get();

    const populatedContentImagePromise = populateDocument<PopulatedContentImage>(
      contentImageDocument,
      false
    );
    const populatedStyleImagePromise = populateDocument<PopulatedStyleImage>(
      styleImageDocument,
      false
    );

    const [populatedContentImage, populatedStyleImage] = await Promise.all([
      populatedContentImagePromise,
      populatedStyleImagePromise,
    ]);

    let populatedStylizedImage: PopulatedStylizedImage | undefined;
    if (querySnapshot.size > 0) {
      const stylizedImageDocument = querySnapshot.docs[0];
      populatedStylizedImage = await populateDocument<PopulatedStylizedImage>(
        stylizedImageDocument,
        true
      );

      res.status(200).json(populatedStylizedImage);
      return;
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
      uid: null,
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
      uid: null,
    };

    res.status(201).json(populatedStylizedImage);
  }
);

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

const createStylizedImageDocument = async (stylizedImage: StylizedImage) => {
  const stylizedImageDocumentReference = await stylizedImagesCollection.add(
    stylizedImage
  );
  return stylizedImageDocumentReference;
};

export const fetchAllStylizedImages = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const querySnapshot = await stylizedImagesCollection.get();
    const populatedStylizedImagesPromises = querySnapshot.docs.map(
      (stylizedImageDocument) =>
        populateDocument<PopulatedStylizedImage>(stylizedImageDocument, true)
    );
    const populatedStylizedImages = await Promise.all(
      populatedStylizedImagesPromises
    );
    res.status(200).json(populatedStylizedImages);
  }
);

export const fetchOneStylizedImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const stylizedImageDocument = await stylizedImagesCollection.doc(id).get();
    const populatedStylizedImage = await populateDocument<PopulatedStylizedImage>(
      stylizedImageDocument,
      true
    );
    res.status(200).json(populatedStylizedImage);
  }
);

export const deleteStylizedImage = catchAsync(
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    await stylizedImagesCollection.doc(id).delete();
    res.status(200).json({ success: true });
  }
);
