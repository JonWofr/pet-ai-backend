export abstract class HttpException extends Error {
  abstract name: string;

  statusCode?: number;
  status?: string;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = this.getStatus(statusCode);

    // Used to exclude this Error from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  getStatus(statusCode: number): string {
    let status: string | undefined;
    switch (statusCode) {
      case 400:
        status = 'Bad Request';
        break;
      case 401:
        status = 'Unauthorized';
        break;
      case 403:
        status = 'Forbidden';
        break;
      case 404:
        status = 'Not Found';
        break;
      case 500:
        status = 'Internal Server Error';
        break;
      default:
        status = 'Error';
        break;
    }
    return status;
  }
}
