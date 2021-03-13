import * as admin from 'firebase-admin';
import * as express from 'express';
import { PopulatedProductCard } from '../../models/populated-product-card.model';
import { ProductCard } from '../../models/product-card.model';
import { TokenRequest } from '../../models/token-request.model';
import { DatabaseHelper } from '../../utils/helpers/database-helper';
import { ContentImage } from '../../models/content-image.model';
import { StyleImage } from '../../models/style-image.model';
import { StylizedImage } from '../../models/stylized-image.model';
import { QueryException } from '../../utils/exceptions/query-exception';
import { UserRole } from '../../enums/user-role.enum';

export class ProductCardController extends DatabaseHelper<
  ProductCard,
  PopulatedProductCard
> {
  constructor() {
    super('product-card');
  }

  async createOrUpdateOneProductCard(
    contentImageDocumentReference: admin.firestore.DocumentReference<ContentImage>,
    styleImageDocumentReference: admin.firestore.DocumentReference<StyleImage>,
    stylizedImageDocumentReference: admin.firestore.DocumentReference<StylizedImage>,
    userId: string,
    userRole: string
  ): Promise<void> {
    const productCardQuery = await this.collection
      .where('contentImage', '==', contentImageDocumentReference)
      .get();
    const productCardQuerySize = productCardQuery.size;
    if (productCardQuerySize === 0) {
      await this.createOneProductCard(
        contentImageDocumentReference,
        styleImageDocumentReference,
        stylizedImageDocumentReference,
        userId,
        userRole
      );
    } else if (productCardQuerySize === 1) {
      const productCardDocumentReference = productCardQuery.docs[0].ref;
      await this.updateOneProductCard(
        productCardDocumentReference,
        styleImageDocumentReference,
        stylizedImageDocumentReference
      );
    } else {
      throw new QueryException(
        `Invalid query result. Expected query size is 0 or 1. Actual query size is ${productCardQuerySize}`,
        500
      );
    }
  }

  async createOneProductCard(
    contentImageDocumentReference: admin.firestore.DocumentReference<ContentImage>,
    styleImageDocumentReference: admin.firestore.DocumentReference<StyleImage>,
    stylizedImageDocumentReference: admin.firestore.DocumentReference<StylizedImage>,
    userId: string,
    userRole: string
  ): Promise<void> {
    const productCard: ProductCard = {
      contentImage: contentImageDocumentReference,
      appliedStyleImages: [styleImageDocumentReference],
      resultingStylizedImages: [stylizedImageDocumentReference],
      userId: userRole === UserRole.Admin ? '' : userId,
      name: '',
    };
    await this.createOne(productCard);
  }

  async updateOneProductCard(
    productCardDocumentReference: admin.firestore.DocumentReference<ProductCard>,
    styleImageDocumentReference: admin.firestore.DocumentReference<StyleImage>,
    stylizedImageDocumentReference: admin.firestore.DocumentReference<StylizedImage>
  ): Promise<void> {
    await productCardDocumentReference.update({
      appliedStyleImages: admin.firestore.FieldValue.arrayUnion(
        styleImageDocumentReference
      ),
      resultingStylizedImages: admin.firestore.FieldValue.arrayUnion(
        stylizedImageDocumentReference
      ),
    });
  }

  async fetchAllProductCards(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { uid: userId, role: userRole = UserRole.User } = req.token;
    const populatedProductCards = await this.fetchAll(userId, userRole);
    res.status(200).json(populatedProductCards);
  }

  async fetchOneProductCard(
    req: TokenRequest,
    res: express.Response
  ): Promise<void> {
    const { uid: userId, role: userRole } = req.token;
    const { id } = req.params;
    const populatedProductCard = await this.fetchOne(id, userId, userRole);
    res.status(200).json(populatedProductCard);
  }
}
