import * as express from 'express';
import * as admin from 'firebase-admin';
import { Image } from '../../models/image';
import { PopulatedImage } from '../../models/populated-image';
import { DatabaseHelper } from '../../utils/helpers/database-helper';
import { FormDataTokenRequest } from '../../models/form-data-token-request';
import { uploadFileToGoogleCloudStorage } from '../../utils/helpers/storage-helper';
import * as sizeOf from 'buffer-image-size';

export class ImageController extends DatabaseHelper<Image, PopulatedImage> {
  constructor() {
    super('images');
  }

  async createOneImage(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const {
      filename,
      mimetype,
      buffer,
    } = (req as FormDataTokenRequest).files[0];

    const filePath = 'images/' + filename;
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
    const imageDocumentReference = await this.createOne(image);
    const populatedImage: PopulatedImage = {
      id: imageDocumentReference.id,
      ...image,
    };
    res.status(201).json(populatedImage);
  }

  async fetchOneImage(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    const populatedImage = await this.fetchOne(id);
    res.status(200).json(populatedImage);
  }

  async fetchAllImages(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const populatedImages = await this.fetchAll();
    res.status(200).json(populatedImages);
  }

  async deleteOneImage(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    const { id } = req.params;
    await this.deleteOne(id);
    res.status(200).json({ success: true });
  }
}
