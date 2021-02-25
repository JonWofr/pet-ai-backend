// 3rd party imports
import * as sizeOf from 'buffer-image-size';
import * as express from 'express';
import * as admin from 'firebase-admin';
import * as firestore from '@google-cloud/firestore';

// Custom imports
import {
  uploadImageToGoogleCloudStorage,
  createImageDocument,
} from '../images/controller';
import { resolveDocumentReferences } from '../content-images/controller'

// Models
import { StyleImage } from '../../models/style-image';
import { User } from '../../models/user';
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';

const styleImagesCollection = admin
  .firestore()
  .collection('style-images')
  .withConverter({
    toFirestore: (styleImage: StyleImage) =>
      styleImage as firestore.DocumentData,
    fromFirestore: (documentData: firestore.DocumentData) =>
      documentData as StyleImage,
  });

export const createStyleImage = async (
  req: express.Request,
  res: express.Response
) => {
  const { name, artist } = req.body;
  const { filename, mimetype, buffer } = (req as MultipartFormdataRequest).files[0];

  const filePath = 'style-images/' + filename;
  const publicUrl = await uploadImageToGoogleCloudStorage(
    filePath,
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

  const styleImageDocumentReference = await createStyleImageDocument(
    imageDocumentReference,
    name,
    artist,
    null
  );

  res.status(201).send({ styleImageId: styleImageDocumentReference.id });
};

const createStyleImageDocument = async (
  image: firestore.DocumentReference<Image>,
  name: string,
  artist: string,
  author: firestore.DocumentReference<User> | null
): Promise<firestore.DocumentReference<StyleImage>> => {
  const styleImage: StyleImage = {
    image,
    name,
    artist,
    author,
  };
  const styleImageDocumentReference = await styleImagesCollection.add(
    styleImage
  );
  return styleImageDocumentReference;
};

export const fetchAllStyleImages = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const querySnapshot = await styleImagesCollection.get();
    const populatedStyleImagesPromises = querySnapshot.docs.map(
      async (documentSnapshot) => {
        const styleImage: StyleImage = documentSnapshot.data();
        const populatedStyleImage = await resolveDocumentReferences(
          styleImage,
          ['image', 'user']
        );
        return populatedStyleImage;
      }
    );
    const styleImages = await Promise.all(
      populatedStyleImagesPromises
    );
    res.status(200).send({ styleImages });
  } catch (err) {
    res.status(500).send(err);
  }
};