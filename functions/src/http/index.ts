// 3rd party imports
import * as express from 'express';
import * as functions from 'firebase-functions';

// Custom imports
import imageRouter from './images/router';
import contentImageRouter from './content-images/router';
import styleImageRouter from './style-images/router';
import stylizedImagesRouter from './stylized-images/router';
import authenticationRouter from './authentication/router';

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', functions.config().frontend.url);
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use('/images', imageRouter);
app.use('/content-images', contentImageRouter);
app.use('/style-images', styleImageRouter);
app.use('/stylized-images', stylizedImagesRouter);
app.use('/authentication', authenticationRouter);

export default app;
