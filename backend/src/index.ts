import { handleGetInfo, handlePostCreate } from './routes/groups.js';
import openapi from './openapi.json';

export const corsHeaders = {
  'Access-Control-Allow-Headers': '*', // What headers are allowed. * is wildcard. Instead of using '*', you can specify a list of specific headers that are allowed, such as: Access-Control-Allow-Headers: X-Requested-With, Content-Type, Accept, Authorization.
  'Access-Control-Allow-Methods': '*', // Allowed methods. Others could be GET, PUT, DELETE etc.
  'Access-Control-Allow-Origin': '*', // This is URLs that are allowed to access the server. * is the wildcard character meaning any URL can.
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response('OK', {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // Remove /api prefix if present to match our route definitions
    let pathname = url.pathname;
    if (pathname.startsWith('/api')) {
      pathname = pathname.substring(4);
    }

    // Serve OpenAPI JSON spec
    if (pathname === '/openapi.json' && request.method === 'GET') {
      return new Response(JSON.stringify(openapi), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve API documentation UI
    if (pathname === '/' && request.method === 'GET') {
      const redocHtml = `<!doctype html>
        <html>
          <head>
            <title>Scalar API Reference</title>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1" />
          </head>

          <body>
            <div id="app"></div>

            <!-- Load the Script -->
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

            <!-- Initialize the Scalar API Reference -->
            <script>
              Scalar.createApiReference('#app', {
                // The URL of the OpenAPI/Swagger document
                url: 'openapi.json',
              })
            </script>
          </body>
        </html>`;

      return new Response(redocHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Handle group routes
    const pathParts = pathname.split('/').filter((part) => part !== '');
    const groupsIndex = pathParts.indexOf('groups');

    if (groupsIndex !== -1 && pathParts.length >= groupsIndex + 2) {
      const groupId = pathParts[groupsIndex + 1];
      const action = pathParts[groupsIndex + 2];

      const routeKey = `${request.method}:/groups/${action}`;
      const illegal: boolean = routes[routeKey] === undefined;

      if (illegal) {
        return new Response('403 Forbidden', { status: 403 });
      }

      const res = await routes[routeKey](request, env, groupId);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          ...Object.fromEntries(res.headers),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    return new Response('404 Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

const routes: Record<
  string,
  (request: Request, env: Env, groupId: string) => Promise<Response>
> = {
  'GET:/groups/info': handleGetInfo,
  'POST:/groups/create': handlePostCreate,
};
