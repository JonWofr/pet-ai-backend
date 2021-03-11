import { FormDataFile } from './form-data-file';
import * as express from 'express';

export interface FormDataRequest extends express.Request {
  files: FormDataFile[];
}
