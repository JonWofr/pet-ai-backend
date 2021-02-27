// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';

// Custom imports
import {
  uploadImageToGoogleCloudStorage,
  createImageDocument,
} from '../images/controller';

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

export const createContentImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
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
      author: null,
    };
    const contentImageDocumentReference = await createContentImageDocument(
      contentImage
    );

    const populatedContentImage: PopulatedContentImage = {
      id: contentImageDocumentReference.id,
      ...contentImage,
      image,
      author: null,
    };
    res.status(201).send(populatedContentImage);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};

const createContentImageDocument = async (
  contentImage: ContentImage
): Promise<admin.firestore.DocumentReference<ContentImage>> => {
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
    const populatedContentImagesPromises = querySnapshot.docs.map(contentImageDocument => populateDocument<PopulatedContentImage>(contentImageDocument, true));
    const populatedContentImages = await Promise.all(
      populatedContentImagesPromises
    );
    res.status(200).send(populatedContentImages);
    return;
  } catch (err) {
    res.status(500).send(err);
    return;
  }
};


export const fetchOneContentImage = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  try {
    const contentImageDocument = await contentImagesCollection.doc(id).get();
    const populatedContentImage = await populateDocument<PopulatedContentImage>(contentImageDocument, true)
    res.status(200).send(populatedContentImage);
    return;
  } catch (error) {
    res.status(500).send(error);
    return;
  }
};

export const populateDocument = async <T>(document: admin.firestore.DocumentSnapshot, shouldAddId = true): Promise<T> => {
  if (!document.exists) {
    throw new Error('Document for which the references should be resolved does not exist')
  }
  const recursivelyResolveReferences = async (
    documentData: admin.firestore.DocumentData
  ) => {
    const populatedDocument: any = {};
    for (let key in documentData) {
      const value = documentData[key];
      if (value instanceof admin.firestore.DocumentReference) {
        const referencedDocument = await (value as admin.firestore.DocumentReference).get();
        if (referencedDocument.exists) {
          const referencedDocumentData = referencedDocument.data()!;
          populatedDocument[key] = await recursivelyResolveReferences(
            referencedDocumentData
          );
        } else {
          throw new Error(
            `DocumentData with key ${key} has invalid reference of value ${value}`
          );
        }
      } else {
        populatedDocument[key] = value;
      }
    }
    return populatedDocument;
  };

  const populatedDocument = await recursivelyResolveReferences(document.data()!)

  if (shouldAddId) {
    populatedDocument.id = document.id
  }

  return populatedDocument
};
