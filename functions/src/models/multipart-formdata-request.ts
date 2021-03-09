import { MultipartFormdataFile } from './multipart-formdata-file';
import * as admin from 'firebase-admin';
import * as express from 'express';

export interface MultipartFormdataRequest extends express.Request {
  files: MultipartFormdataFile[];
  token?: admin.auth.DecodedIdToken;
}
