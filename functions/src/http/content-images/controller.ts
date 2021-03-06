// 3rd party imports
import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';

// Custom imports
import { createImageDocument } from '../images/controller';
import { populateDocument } from '../../utils/database-helper';
import { stylizedImagesCollection } from '../stylized-images/controller';
import { uploadFileToGoogleCloudStorage } from '../../utils/storage-helper';

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
    const populatedContentImagesPromises = querySnapshot.docs.map(
      (contentImageDocument) =>
        populateDocument<PopulatedContentImage>(contentImageDocument, true)
    );
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
    const populatedContentImage = await populateDocument<PopulatedContentImage>(
      contentImageDocument,
      true
    );
    res.status(200).send(populatedContentImage);
    return;
  } catch (error) {
    res.status(500).send(error);
    return;
  }
};

export const deleteContentImage = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  const contentImageDocumentReference = contentImagesCollection.doc(id);
  const contentImageDocument = await contentImageDocumentReference.get();

  if (!contentImageDocument.exists) {
    res.status(400).send(`Document with id ${id} does not exist`);
    return;
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

  res.status(200).send({ success: true });
  return;
};
