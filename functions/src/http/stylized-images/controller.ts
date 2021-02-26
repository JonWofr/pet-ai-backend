// 3rd party imports
import * as express from 'express';
import * as http from 'http';
import * as functions from 'firebase-functions';

interface NstModelResponse {
  predictions: { stylizedImagePublicUrl: string }[];
}

export const createStylizedImage = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const nstModelRequestOptions: http.RequestOptions = {
      method: 'POST',
      host: functions.config().nstmodel.host,
      port: functions.config().nstmodel.port,
      path: '/predict',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const nstModelResponse = await makeHttpRequest<NstModelResponse>(
      nstModelRequestOptions,
      req.body
    );
    const { stylizedImagePublicUrl } = nstModelResponse.predictions[0];
    

    res.status(201).send(stylizedImagePublicUrl);
  } catch (err) {
    res.status(500).send(err);
  }
};

// Makes an http request. Does only work for a response type of json.
const makeHttpRequest = <T>(
  requestOptions: http.RequestOptions,
  body?: Object
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const request = http.request(requestOptions);

    request.on('response', (response: http.IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      });
      // Error trying to receive the response
      response.on('error', reject);
    });

    // Error trying to send the request
    request.on('error', reject);

    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
};
