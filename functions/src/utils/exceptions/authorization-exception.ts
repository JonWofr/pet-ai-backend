import { HttpException } from './http-exception';

export class AuthorizationException extends HttpException {
  name: string;
  constructor(message: string, statusCode: number) {
    super(message, statusCode);

    this.name = 'AuthorizationException';
  }
}
