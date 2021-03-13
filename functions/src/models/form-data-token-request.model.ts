import * as admin from 'firebase-admin';
import { FormDataRequest } from './form-data-request.model';

export interface FormDataTokenRequest extends FormDataRequest {
  token: admin.auth.DecodedIdToken;
}
