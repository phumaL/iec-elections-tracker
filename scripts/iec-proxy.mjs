import { createServer } from 'node:http';
import { Readable } from 'node:stream';

/**
 * Tiny local CORS proxy for the Expo web preview.
 *
 * The IEC results host does not send Access-Control-Allow-Origin, so browsers
 * cannot fetch the JSON files directly. Native builds do not need this.
 *
 * Usage:
 *   npm run proxy
 *   EXPO_PUBLIC_IEC_PROXY=http://localhost:8787/proxy npm run web
 */

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_PREFIX = 'https://results.elections.org.za/';

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, If-None-Match, If-Modified-Since',
  );
  response.setHeader(
    'Access-Control-Expose-Headers',
    'ETag, Last-Modified, Content-Length',
  );
  response.setHeader('Access-Control-Max-Age', '86400');
}

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url || '/', `http://localhost:${PORT}`);

  if (requestUrl.pathname !== '/proxy') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(
      'IEC proxy is running. Use /proxy?url=<encoded IEC results URL>.',
    );
    return;
  }

  const target = requestUrl.searchParams.get('url');

  if (!target || !target.startsWith(ALLOWED_PREFIX)) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(
      `Only URLs beginning with ${ALLOWED_PREFIX} may be proxied.`,
    );
    return;
  }

  try {
    const upstreamHeaders = {
      Accept:
        request.headers.accept ||
        'application/javascript, application/json, text/plain, */*',
      'User-Agent': 'IEC-Live-Results-Proxy/1.0',
    };

    if (request.headers['if-none-match']) {
      upstreamHeaders['If-None-Match'] = request.headers['if-none-match'];
    }
    if (request.headers['if-modified-since']) {
      upstreamHeaders['If-Modified-Since'] =
        request.headers['if-modified-since'];
    }

    const upstream = await fetch(target, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
    });

    response.writeHead(upstream.status, {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/javascript',
      'Cache-Control': 'no-store',
      'X-Proxied-By': 'iec-live-results',
      ...(upstream.headers.get('etag')
        ? { ETag: upstream.headers.get('etag') }
        : {}),
      ...(upstream.headers.get('last-modified')
        ? { 'Last-Modified': upstream.headers.get('last-modified') }
        : {}),
    });

    console.log(
      `${upstream.status} ${target.replace(ALLOWED_PREFIX, '')}`,
    );

    if (request.method === 'HEAD' || upstream.status === 304) {
      response.end();
      return;
    }

    if (!upstream.body) {
      response.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    console.error('Proxy error:', error);
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }
    response.end('Could not reach the IEC results service.');
  }
});

server.listen(PORT, () => {
  console.log(
    `IEC CORS proxy listening on http://localhost:${PORT}/proxy`,
  );
  console.log(
    `Use EXPO_PUBLIC_IEC_PROXY=http://localhost:${PORT}/proxy for the web preview.`,
  );
});
