// 3rd party imports
import * as express from 'express';

// Custom imports
import imageRouter from './images/router';
import contentImageRouter from './content-images/router';
import styleImageRouter from './style-images/router'

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use('/images', imageRouter);
app.use('/content-images', contentImageRouter);
app.use('/style-images', styleImageRouter)

export default app;
