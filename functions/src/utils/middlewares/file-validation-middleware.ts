import * as express from 'express';
import { FormDataFile } from '../../models/form-data-file.model';
import { FormDataRequest } from '../../models/form-data-request.model';
import { InvalidUploadException } from '../exceptions/invalid-upload-exception';

const allowedMimeTypes = ['image/jpeg'];
const allowedFileExtensions = ['jpg', 'jpeg'];

export const checkFile = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const files: FormDataFile[] = (req as FormDataRequest).files;

  if (files.length !== 1) {
    throw new InvalidUploadException(
      'Only one file is allowed for this endpoint',
      400
    );
  }

  const { filename, mimetype, buffer } = files[0];

  if (!isFilenameValid(filename)) {
    throw new InvalidUploadException(
      "The file's filename is missing or invalid",
      400
    );
  }
  if (!isMimeTypeValid(mimetype)) {
    throw new InvalidUploadException(
      "The file's mime-type is missing or invalid",
      400
    );
  }
  if (buffer.length === 0) {
    throw new InvalidUploadException('The file does not contain any data', 400);
  }
  next();
};

export const isFilenameValid = (filename?: string): boolean => {
  if (filename === undefined) {
    return false;
  }
  const filenameParts = filename.split('.');
  if (filenameParts.length < 2) {
    return false;
  }
  const fileExtension = filenameParts[filenameParts.length - 1];
  if (!isFileExtensionAllowed(fileExtension)) {
    return false;
  }
  return true;
};

const isFileExtensionAllowed = (fileExtension: string): boolean => {
  // To lower case to ensure that e.g. .JPG and .jpg extensions are handled the same
  return allowedFileExtensions.includes(fileExtension.toLowerCase());
};

export const isMimeTypeValid = (mimeType?: string): boolean => {
  return mimeType !== undefined && isMimeTypeAllowed(mimeType);
};

const isMimeTypeAllowed = (mimeType: string): boolean => {
  return allowedMimeTypes.includes(mimeType);
};
