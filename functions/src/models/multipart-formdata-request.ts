import * as express from 'express';
import { MultipartFormdataFile } from './multipart-formdata-file';

export interface MultipartFormdataRequest extends express.Request {
  files: MultipartFormdataFile[];
}
