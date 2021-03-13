import * as sizeOf from 'buffer-image-size';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { ImageController } from '../images/controller';
import { uploadFileToGoogleCloudStorage } from '../../utils/helpers/storage-helper';
import { StyleImage } from '../../models/style-image.model';
import { Image } from '../../models/image.model';
import { PopulatedStyleImage } from '../../models/populated-style-image.model';
import { StylizedImageController } from '../stylized-images/controller';
import { DatabaseHelper } from '../../utils/helpers/database-helper';
import { FormDataTokenRequest } from '../../models/form-data-token-request.model';
import { TokenRequest } from '../../models/token-request.model';

export class StyleImageController extends DatabaseHelper<
  StyleImage,
  PopulatedStyleImage
> {
  constructor() {
    super('style-images');
  }

  async createOneStyleImage(
    req: FormDataTokenRequest,
    res: express.Response
  ): Promise<void> {
    const { name, artist } = req.body;
    const { filename, mimetype, buffer } = req.files[0];

    const filePath = 'style-images/' + filename;
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

    const styleImage: StyleImage = {
      image: imageDocumentReference,
      name,
      artist,
    };
    const styleImageDocumentReference = await this.createOne(styleImage);

    const populatedStyleImage: PopulatedStyleImage = {
      id: styleImageDocumentReference.id,
      ...styleImage,
      image,
    };
    res.status(201).json(populatedStyleImage);
  }

  async fetchOneStyleImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    const populatedContentImage = await this.fetchOne(id);
    res.status(200).json(populatedContentImage);
  }

  async fetchAllStyleImages(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const populatedContentImage = await this.fetchAll();
    res.status(200).json(populatedContentImage);
  }

  async deleteOneStyleImage(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    const styleImageDocumentReference = this.collection.doc(id);
    const styleImageDocument = await styleImageDocumentReference.get();
    this.checkDocumentExistence(styleImageDocument);

    // Delete all stylized image documents that reference this one
    const stylizedImageController = new StylizedImageController();
    const stylizedImageQuerySnaphot = await stylizedImageController.collection
      .where('styleImage', '==', styleImageDocumentReference)
      .get();
    const stylizedImageDeletionsPromises = stylizedImageQuerySnaphot.docs.map(
      (stylizedImageDocument) => stylizedImageDocument.ref.delete()
    );
    await Promise.all(stylizedImageDeletionsPromises);

    // Delete corresponding document
    await styleImageDocumentReference.delete();

    // Delete the image document that is referenced by this one
    const styleImage = styleImageDocument.data()!;
    await styleImage.image.delete();

    res.status(200).json({ success: true });
  }
}
