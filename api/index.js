import { createRequestHandler } from '../server.js';

const handler = createRequestHandler({ serveStatic: false });

export default function vercelHandler(request, response) {
  const path = request.query.path || '';
  request.url = `/api/${path}`;
  return handler(request, response);
}
