import { MultipartFormdataFile } from './multipart-formdata-file';
import { TokenRequest } from './token-request';

export interface MultipartFormdataRequest extends TokenRequest {
  files: MultipartFormdataFile[];
}
