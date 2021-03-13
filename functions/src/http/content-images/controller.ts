import * as express from 'express';
import * as sizeOf from 'buffer-image-size';
import * as admin from 'firebase-admin';
import { ImageController } from '../images/controller';
import { StylizedImageController } from '../stylized-images/controller';
import { uploadFileToGoogleCloudStorage } from '../../utils/helpers/storage-helper';
import { Image } from '../../models/image.model';
import { ContentImage } from '../../models/content-image.model';
import { PopulatedContentImage } from '../../models/populated-content-image.model';
import { TokenRequest } from '../../models/token-request.model';
import { FormDataTokenRequest } from '../../models/form-data-token-request.model';
import { DatabaseHelper } from '../../utils/helpers/database-helper';
import { UserRole } from '../../enums/user-role.enum';

export class ContentImageController extends DatabaseHelper<
  ContentImage,
  PopulatedContentImage
> {
  constructor() {
    super('content-images');
  }

  async createOneContentImage(
    req: FormDataTokenRequest,
    res: express.Response
  ): Promise<void> {
    const { filename, mimetype, buffer } = req.files[0];
    const { uid: userId, role: userRole = UserRole.User } = req.token;

    const filePath = `content-images/${filename}`;
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
    const imageController = new ImageController();
    const imageDocumentReference = await imageController.createOne(image);
    const contentImage: ContentImage = {
      image: imageDocumentReference,
      userId: userRole === UserRole.Admin ? '' : userId,
    };
    const contentImageDocumentReference = await this.createOne(contentImage);

    const populatedContentImage: PopulatedContentImage = {
      id: contentImageDocumentReference.id,
      ...contentImage,
      image,
    };
    res.status(201).json(populatedContentImage);
  }

  async fetchOneContentImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    const { uid: userId, role: userRole = UserRole.User } = req.token;
    const populatedContentImage = await this.fetchOne(id, userId, userRole);
    res.status(200).json(populatedContentImage);
  }

  async fetchAllContentImages(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { uid: userId, role: userRole = UserRole.User } = req.token;
    const populatedContentImage = await this.fetchAll(userId, userRole);
    res.status(200).json(populatedContentImage);
  }

  async deleteOneContentImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;

    const contentImageDocumentReference = this.collection.doc(id);
    const contentImageDocument = await contentImageDocumentReference.get();
    this.checkDocumentExistence(contentImageDocument);

    // Delete all stylized image documents that reference this one
    const stylizedImageController = new StylizedImageController();
    const stylizedImageQuerySnaphot = await stylizedImageController.collection
      .where('contentImage', '==', contentImageDocumentReference)
      .get();
    const stylizedImageDeletionsPromises = stylizedImageQuerySnaphot.docs.map(
      (stylizedImageDocument) => stylizedImageDocument.ref.delete()
    );
    await Promise.all(stylizedImageDeletionsPromises);

    // Delete corresponding document
    await contentImageDocumentReference.delete();

    // Delete the image document that is referenced by this one
    const contentImage = contentImageDocument.data()!;
    await contentImage.image.delete();

    res.status(200).json({ success: true });
  }
}
