// 3rd party imports
import * as sizeOf from 'buffer-image-size';
import * as express from 'express';
import * as admin from 'firebase-admin';

// Custom imports
import {
  uploadImageToGoogleCloudStorage,
  createImageDocument,
} from '../images/controller';
import { populateDocument } from '../content-images/controller';

// Models
import { StyleImage } from '../../models/style-image';
import { Image } from '../../models/image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';
import { PopulatedStyleImage } from '../../models/populated-style-image';

export const styleImagesCollection = admin
  .firestore()
  .collection('style-images')
  .withConverter({
    toFirestore: (styleImage: StyleImage) =>
      styleImage as admin.firestore.DocumentData,
    fromFirestore: (documentData: admin.firestore.DocumentData) =>
      documentData as StyleImage,
  });

export const createStyleImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { name, artist } = req.body;
    const {
      filename,
      mimetype,
      buffer,
    } = (req as MultipartFormdataRequest).files[0];

    const filePath = 'style-images/' + filename;
    const publicUrl = await uploadImageToGoogleCloudStorage(
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
    }
    const imageDocumentReference = await createImageDocument(image);

    const styleImage: StyleImage = {
      image: imageDocumentReference,
      name,
      artist,
      author: null,
    }
    const styleImageDocumentReference = await createStyleImageDocument(styleImage);

    const populatedStyleImage: PopulatedStyleImage = {
      id: styleImageDocumentReference.id,
      ...styleImage,
      image,
      author: null
    }
    res.status(201).send(populatedStyleImage);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};

const createStyleImageDocument = async (
  styleImage: StyleImage
): Promise<admin.firestore.DocumentReference<StyleImage>> => {
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
    const populatedStyleImagesPromises = querySnapshot.docs.map((styleImageDocument) => populateDocument<PopulatedStyleImage>(styleImageDocument, true));
    const populatedStyleImages = await Promise.all(populatedStyleImagesPromises);
    res.status(200).send(populatedStyleImages);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const fetchOneStyleImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const styleImageDocument = await styleImagesCollection.doc(id).get();
    const populatedStyleImage = await populateDocument<PopulatedStyleImage>(styleImageDocument, true)
    res.status(200).send(populatedStyleImage);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};
