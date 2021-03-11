import * as admin from 'firebase-admin';
import { UserRole } from '../../enums/user-role.enum';
import { AuthorizationException } from '../exceptions/authorization-exception';
import { DocumentDoesNotExistException } from '../exceptions/document-does-not-exist-execption';

export abstract class DatabaseHelper<DocumentData, PopulatedDocumentData> {
  collection: admin.firestore.CollectionReference<DocumentData>;

  constructor(resourceName: string) {
    this.collection = admin
      .firestore()
      .collection(resourceName)
      .withConverter({
        toFirestore: (documentData: DocumentData) =>
          documentData as admin.firestore.DocumentData,
        fromFirestore: (document: admin.firestore.QueryDocumentSnapshot) =>
          document.data() as DocumentData,
      });
  }

  async createOne(
    documentData: DocumentData
  ): Promise<admin.firestore.DocumentReference<DocumentData>> {
    const documentReference = await this.collection.add(documentData);
    return documentReference;
  }

  async fetchOne(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<PopulatedDocumentData> {
    const document = await this.collection.doc(id).get();
    this.checkDocumentExistence(document);
    if (userId && userRole && userRole !== UserRole.Admin) {
      this.checkDocumentAccess(userId, document);
    }
    const populatedDocumentData = this.populateDocument(document, true, true);
    return populatedDocumentData;
  }

  async fetchAll(
    userId?: string,
    userRole?: UserRole
  ): Promise<PopulatedDocumentData[]> {
    let documents: admin.firestore.QuerySnapshot<DocumentData>;
    if (userId && userRole && userRole !== UserRole.Admin) {
      documents = await this.collection
        .where('userId', 'in', ['', userId])
        .get();
    } else {
      documents = await this.collection.get();
    }
    const populatedContentImagesPromises = documents.docs.map((document) =>
      this.populateDocument(document, true, true)
    );
    const populatedDocumentDatas = await Promise.all(
      populatedContentImagesPromises
    );
    return populatedDocumentDatas;
  }

  async deleteOne(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<void> {
    const documentReference = this.collection.doc(id);
    const document = await documentReference.get();
    this.checkDocumentExistence(document);
    if (userId && userRole && userRole !== UserRole.Admin) {
      this.checkDocumentAccess(userId, document);
    }
    await documentReference.delete();
  }

  checkDocumentExistence(
    document: admin.firestore.DocumentSnapshot<DocumentData>
  ): void {
    if (!document.exists) {
      throw new DocumentDoesNotExistException(
        `The document with id ${document.id} does not exist`,
        404
      );
    }
  }

  checkDocumentAccess(
    userId: string,
    document: admin.firestore.DocumentSnapshot
  ): void {
    const documentData = document.data()!;
    if (documentData.userId && userId !== documentData.userId) {
      throw new AuthorizationException(
        `You are not allowed to read, write or delete document with id ${document.id}`,
        403
      );
    }
  }

  async populateDocument(
    document: admin.firestore.DocumentSnapshot<DocumentData>,
    shouldAddId = true,
    shouldPopulate = true
  ): Promise<PopulatedDocumentData> {
    const documentData = document.data()!;
    let populatedDocumentData: any;
    if (shouldPopulate) {
      populatedDocumentData = await this.recursivelyResolveReferences(
        documentData
      );
    } else {
      populatedDocumentData = documentData;
    }
    if (shouldAddId) {
      populatedDocumentData.id = document.id;
    }
    return populatedDocumentData as PopulatedDocumentData;
  }

  async recursivelyResolveReferences(
    documentData: admin.firestore.DocumentData
  ): Promise<PopulatedDocumentData> {
    const populatedDocumentData: any = {};
    for (const key in documentData) {
      const value = documentData[key];
      if (value instanceof admin.firestore.DocumentReference) {
        const referencedDocument = await (value as admin.firestore.DocumentReference).get();
        if (referencedDocument.exists) {
          const referencedDocumentData = referencedDocument.data()!;
          populatedDocumentData[key] = await this.recursivelyResolveReferences(
            referencedDocumentData
          );
        } else {
          populatedDocumentData[key] = null;
        }
      } else {
        populatedDocumentData[key] = value;
      }
    }
    return populatedDocumentData as PopulatedDocumentData;
  }
}
