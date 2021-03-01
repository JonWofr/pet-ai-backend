import * as admin from 'firebase-admin';

const BUCKET_NAME = 'petai-bdd53.appspot.com';
const bucket = admin.storage().bucket(BUCKET_NAME);

export const uploadFileToGoogleCloudStorage = (
  filename: string,
  contentType: string,
  buffer: Buffer
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const file = bucket.file(filename);
    const writableStream = file.createWriteStream({
      contentType,
      resumable: false,
    });
    writableStream.on('error', reject);
    writableStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
      resolve(publicUrl);
    });
    writableStream.write(buffer);
    writableStream.end();
  });
};
