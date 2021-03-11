import * as express from 'express';
import * as http from 'http';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sizeOf from 'buffer-image-size';
import { StylizedImage } from '../../models/stylized-image';
import { PopulatedStylizedImage } from '../../models/populated-stylized-image';
import { Image } from '../../models/image';
import { ContentImageController } from '../content-images/controller';
import { StyleImageController } from '../style-images/controller';
import { ImageController } from '../images/controller';
import { makeHttpRequest } from '../../utils/helpers/http-helper';
import { TokenRequest } from '../../models/token-request';
import { DatabaseHelper } from '../../utils/helpers/database-helper';
import { UserRole } from '../../enums/user-role.enum';

interface NstModelResponse {
  predictions: { stylizedImagePublicUrl: string }[];
}

const BUCKET_NAME = 'petai-bdd53.appspot.com';
const bucket = admin.storage().bucket(BUCKET_NAME);

export class StylizedImageController extends DatabaseHelper<
  StylizedImage,
  PopulatedStylizedImage
> {
  constructor() {
    super('stylized-images');
  }

  async createOneStylizedImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { contentImageId, styleImageId, name } = req.body;
    const { uid: userId, role: userRole = UserRole.User } = req.token;

    const contentImageController = new ContentImageController();
    const contentImageDocumentPromise = contentImageController.collection
      .doc(contentImageId)
      .get();

    const styleImageController = new StyleImageController();
    const styleImageDocumentPromise = styleImageController.collection
      .doc(styleImageId)
      .get();

    const [contentImageDocument, styleImageDocument] = await Promise.all([
      contentImageDocumentPromise,
      styleImageDocumentPromise,
    ]);

    contentImageController.checkDocumentExistence(contentImageDocument);
    if (userRole !== UserRole.Admin) {
      contentImageController.checkDocumentAccess(userId, contentImageDocument);
    }

    styleImageController.checkDocumentExistence(styleImageDocument);
    if (userRole !== UserRole.Admin) {
      styleImageController.checkDocumentAccess(userId, styleImageDocument);
    }

    const contentImageDocumentReference = contentImageDocument.ref;
    const styleImageDocumentReference = styleImageDocument.ref;
    const stylizedImageDocuments = await this.collection
      .where('contentImage', '==', contentImageDocumentReference)
      .where('styleImage', '==', styleImageDocumentReference)
      .get();

    let populatedStylizedImage: PopulatedStylizedImage | undefined;
    if (stylizedImageDocuments.size > 0) {
      const stylizedImageDocument = stylizedImageDocuments.docs[0];
      if (userRole !== UserRole.Admin) {
        this.checkDocumentAccess(userId, stylizedImageDocument);
      }
      populatedStylizedImage = await this.populateDocument(
        stylizedImageDocument,
        true,
        true
      );

      res.status(200).json(populatedStylizedImage);
      return;
    }

    const populatedContentImagePromise = contentImageController.populateDocument(
      contentImageDocument,
      false,
      true
    );
    const populatedStyleImagePromise = styleImageController.populateDocument(
      styleImageDocument,
      false,
      true
    );

    const [populatedContentImage, populatedStyleImage] = await Promise.all([
      populatedContentImagePromise,
      populatedStyleImagePromise,
    ]);

    const stylizedImagePublicUrl = await this.requestNstModel(
      populatedContentImage.image.publicUrl,
      populatedStyleImage.name
    );

    const stylizedImagePath = this.getImagePath(stylizedImagePublicUrl);
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
    const imageController = new ImageController();
    const imageDocumentReference = await imageController.createOne(image);

    const stylizedImage: StylizedImage = {
      contentImage: contentImageDocumentReference,
      styleImage: styleImageDocumentReference,
      image: imageDocumentReference,
      name,
      userId: userRole === UserRole.Admin ? '' : userId,
    };
    const stylizedImageDocumentReference = await this.createOne(stylizedImage);

    populatedStylizedImage = {
      id: stylizedImageDocumentReference.id,
      ...stylizedImage,
      contentImage: populatedContentImage,
      styleImage: populatedStyleImage,
      image,
    };

    res.status(201).json(populatedStylizedImage);
  }

  async fetchOneStylizedImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    const { uid: userId, role: userRole = UserRole.User } = req.token;
    const populatedStylizedImage = await this.fetchOne(id, userId, userRole);
    res.status(200).json(populatedStylizedImage);
  }

  async fetchAllStylizedImages(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { uid: userId, role: userRole = UserRole.User } = req.token;
    const populatedStylizedImages = await this.fetchAll(userId, userRole);
    res.status(200).json(populatedStylizedImages);
  }

  async deleteOneStylizedImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    await this.deleteOne(id);
    res.status(200).send({ success: true });
  }

  async requestNstModel(
    contentImagePublicUrl: string,
    styleImageName: string
  ): Promise<string> {
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
  }

  getImagePath(imagePublicUrl: string): string {
    const imagePublicUrlParts = imagePublicUrl.split('/');
    const bucketPartIndex = imagePublicUrlParts.indexOf(BUCKET_NAME);
    const imagePath = imagePublicUrlParts
      .slice(bucketPartIndex + 1, imagePublicUrlParts.length)
      .join('/');
    return imagePath;
  }
}
