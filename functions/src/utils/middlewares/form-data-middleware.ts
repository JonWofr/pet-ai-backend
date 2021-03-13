import * as Busboy from 'busboy';
import * as express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FormDataFile } from '../../models/form-data-file.model';
import { FormDataRequest } from '../../models/form-data-request.model';

// Code copied from https://mikesukmanowsky.com/firebase-file-and-image-uploads/
// Applied minor changes to comply to the ts compiler

export const uploadFormData = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const busboy = new Busboy({ headers: req.headers });

  const fields: { [fieldname: string]: any } = {};
  const files: FormDataFile[] = [];
  const fileWrites: Promise<void>[] = [];
  const tmpdir = os.tmpdir();

  busboy.on('field', (fieldname, value) => {
    fields[fieldname] = value;
  });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const filepath = path.join(tmpdir, filename);
    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);
    fileWrites.push(
      new Promise<void>((resolve, reject) => {
        file.on('end', () => writeStream.end());
        writeStream.on('finish', () => {
          fs.readFile(filepath, (err, buffer) => {
            const size = Buffer.byteLength(buffer);
            if (err) {
              reject(err);
            }

            files.push({
              fieldname,
              filename,
              encoding,
              mimetype,
              buffer,
              size,
            });

            try {
              fs.unlinkSync(filepath);
            } catch (error) {
              reject(error);
            }

            resolve();
          });
        });
        writeStream.on('error', reject);
      })
    );
  });

  busboy.on('finish', () => {
    Promise.all(fileWrites)
      .then(() => {
        req.body = fields;
        (req as FormDataRequest).files = files;
        next();
      })
      .catch(next);
  });

  busboy.end((req as any).rawBody);
};
