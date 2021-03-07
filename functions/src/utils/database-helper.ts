// 3rd party imports
import * as admin from 'firebase-admin';

// Custom imports
import { DocumentDoesNotExistException } from '../utils/exceptions/document-does-not-exist-execption';

export const populateDocument = async <T>(
  document: admin.firestore.DocumentSnapshot,
  shouldAddId = true
): Promise<T> => {
  if (!document.exists) {
    throw new DocumentDoesNotExistException(
      `The document with id ${document.id} does not exist`,
      404
    );
  }

  const populatedDocument = await recursivelyResolveReferences(
    document.data()!
  );

  if (shouldAddId) {
    populatedDocument.id = document.id;
  }

  return populatedDocument;
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
