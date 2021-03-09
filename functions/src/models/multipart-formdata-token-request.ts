import * as admin from 'firebase-admin';
import { MultipartFormdataRequest } from './multipart-formdata-request';

export interface MultipartFormdataTokenRequest
  extends MultipartFormdataRequest {
  token: admin.auth.DecodedIdToken;
}
