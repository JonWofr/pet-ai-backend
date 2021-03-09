import * as admin from 'firebase-admin';
import { DocumentDoesNotExistException } from '../utils/exceptions/document-does-not-exist-execption';
import { AuthorizationException } from './exceptions/authorization-exception';

export const processDocument = async <T>(
  document: admin.firestore.DocumentSnapshot,
  shouldAddId = true,
  shouldPopulate = true,
  userId?: string
): Promise<T> => {
  checkDocument(document, userId);
  const documentData = await populateDocument<T>(
    document,
    shouldAddId,
    shouldPopulate
  );
  return documentData;
};

export const checkDocument = (
  document: admin.firestore.DocumentSnapshot,
  userId?: string
) => {
  if (!document.exists) {
    throw new DocumentDoesNotExistException(
      `The document with id ${document.id} does not exist`,
      404
    );
  }
  const documentData = document.data()!;
  if (userId && userId !== documentData.userId) {
    throw new AuthorizationException(
      `You are not allowed to read, write or delete document with id ${document.id}`,
      403
    );
  }
};

export const populateDocument = async <T>(
  document: admin.firestore.DocumentSnapshot,
  shouldAddId = true,
  shouldPopulate = true
): Promise<T> => {
  let documentData = document.data()! as any;
  if (shouldPopulate) {
    documentData = await recursivelyResolveReferences(documentData);
  }
  if (shouldAddId) {
    documentData.id = document.id;
  }
  return documentData;
};

const recursivelyResolveReferences = async (
  documentData: admin.firestore.DocumentData
) => {
  const populatedDocument: any = {};
  for (const key in documentData) {
    const value = documentData[key];
    if (value instanceof admin.firestore.DocumentReference) {
      const referencedDocument = await (value as admin.firestore.DocumentReference).get();
      if (referencedDocument.exists) {
        const referencedDocumentData = referencedDocument.data()!;
        populatedDocument[key] = await recursivelyResolveReferences(
          referencedDocumentData
        );
      } else {
        populatedDocument[key] = null;
      }
    } else {
      populatedDocument[key] = value;
    }
  }
  return populatedDocument;
};
