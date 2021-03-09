import * as express from 'express';
import * as functions from 'firebase-functions';

export const handleException = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.trace(err.stack);

  err.statusCode = err.statusCode ?? 500;
  err.status = err.status ?? 'error';

  const environmentName = functions.config().environment.name;

  if (environmentName === 'development') {
    handleExceptionDev(err, res);
  } else if (environmentName === 'production') {
    handleExceptionProd(err, res);
  } else {
    next(err);
  }
};

const handleExceptionDev = (err: any, res: express.Response) => {
  res.status(err.statusCode).send({
    name: err.name,
    statusCode: err.statusCode,
    status: err.status,
    message: err.message,
    stack: err.stack,
  });
};

const handleExceptionProd = (err: any, res: express.Response) => {
  res.status(err.statusCode).json({
    name: err.name,
    statusCode: err.statusCode,
    status: err.status,
    message: err.message,
  });
};

export const catchAsync = (
  fn: (req: any, res: any, next: any) => Promise<void>
) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    fn(req, res, next).catch(next);
  };
};
