// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as firestore from '@google-cloud/firestore';
import * as admin from 'firebase-admin';

// Custom imports
import {
  uploadImageToGoogleCloudStorage,
  createImageDocument,
} from '../images/controller';

// Models
import { User } from '../../models/user';
import { Image } from '../../models/image';
import { ContentImage } from '../../models/content-image';
import { MultipartFormdataRequest } from '../../models/multipart-formdata-request';

const contentImagesCollection = admin
  .firestore()
  .collection('content-images')
  .withConverter({
    toFirestore: (contentImage: ContentImage) =>
      contentImage as firestore.DocumentData,
    fromFirestore: (documentData: firestore.DocumentData) =>
      documentData as ContentImage,
  });

export const createContentImage = async (
  req: express.Request,
  res: express.Response
) => {
  const { name } = (req as MultipartFormdataRequest).body;
  const {
    filename,
    mimetype,
    buffer,
  } = (req as MultipartFormdataRequest).files[0];

  const filePath = 'content-images/' + filename;
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

  const contentImageDocumentReference = await createContentImageDocument(
    imageDocumentReference,
    name,
    null
  );

  res.status(201).send({ contentImageId: contentImageDocumentReference.id });
};

const createContentImageDocument = async (
  image: firestore.DocumentReference<Image>,
  name: string,
  author: firestore.DocumentReference<User> | null
): Promise<firestore.DocumentReference<ContentImage>> => {
  const contentImage: ContentImage = {
    image,
    name,
    author,
  };
  const contentImageDocumentReference = await contentImagesCollection.add(
    contentImage
  );
  return contentImageDocumentReference;
};

export const fetchAllContentImages = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const querySnapshot = await contentImagesCollection.get();
    const populatedContentImagesPromises = querySnapshot.docs.map(
      async (contentImageDocument) => {
        const populatedContentImage = await getPopulatedDocumentData(
          contentImageDocument,
          ['image', 'author'],
          true
        );
        return populatedContentImage;
      }
    );
    const populatedContentImages = await Promise.all(
      populatedContentImagesPromises
    );
    res.status(200).send(populatedContentImages);
  } catch (err) {
    res.status(500).send(err);
  }
};

// Shallow document references of any document can be resolved with this method
export const getPopulatedDocumentData = async (
  document: firestore.DocumentSnapshot,
  referenceKeys: string[],
  shouldAddId: boolean = true
): Promise<firestore.DocumentData> => {
  if (!document.exists) {
    throw new Error(
      'Document for which the references should be resolved does not exist'
    );
  }
  const documentData = document.data()!;
  const documentReferencesPromises = referenceKeys
    .filter((referenceKey) => {
      // Check if the key exists in the document and if the value of the key is not falsy
      return referenceKey in documentData && documentData[referenceKey];
    })
    .map(async (referenceKey) => {
      const referencedDocument = await (documentData[
        referenceKey
      ] as firestore.DocumentReference).get();
      if (!referencedDocument.exists)
        throw new Error('References could not be resolved');
      const referencedDocumentData = referencedDocument.data()!;
      documentData[referenceKey] = referencedDocumentData;
    });
  await Promise.all(documentReferencesPromises);
  if (shouldAddId) {
    documentData['id'] = document.id;
  }
  return documentData;
};

export const fetchOneContentImage = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  try {
    const document = await contentImagesCollection.doc(id).get();
    const populatedContentImage = await getPopulatedDocumentData(
      document,
      ['image', 'author'],
      true
    );
    res.status(200).send(populatedContentImage);
  } catch (error) {
    res.status(500).send(error);
  }
};
