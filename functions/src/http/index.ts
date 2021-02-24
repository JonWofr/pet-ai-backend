import * as express from 'express';
import imageRouter from './images/router';

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use('/images', imageRouter);

export default app;
