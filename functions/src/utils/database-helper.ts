import * as admin from 'firebase-admin';

export const populateDocument = async <T>(
  document: admin.firestore.DocumentSnapshot,
  shouldAddId = true
): Promise<T> => {
  if (!document.exists) {
    throw new Error(
      'Document for which the references should be resolved does not exist'
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
