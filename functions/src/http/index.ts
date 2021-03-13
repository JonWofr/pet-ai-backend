import * as express from 'express';
import * as functions from 'firebase-functions';
import imageRouter from './images/router';
import contentImageRouter from './content-images/router';
import styleImageRouter from './style-images/router';
import stylizedImagesRouter from './stylized-images/router';
import productCardRouter from './product-cards/router';
import { handleException } from '../utils/middlewares/exception-handling-middleware';

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', functions.config().frontend.url);
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'Authorization']);
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use('/images', imageRouter);
app.use('/content-images', contentImageRouter);
app.use('/style-images', styleImageRouter);
app.use('/stylized-images', stylizedImagesRouter);
app.use('/product-cards', productCardRouter);

// If in any synchronous request handler or asynchronous request handler wrapped inside the catchAsync
// function an exception is thrown the handleException method catches it and reponds to the client
app.use(handleException);

export default app;
