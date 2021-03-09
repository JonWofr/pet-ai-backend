import * as http from 'http';

// Makes an http request. Does only work for a response type of json.
export const makeHttpRequest = <T>(
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
