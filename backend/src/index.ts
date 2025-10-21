import { handleGetInfo, handlePostCreate } from './routes/groups.js';
import openapi from './openapi.json';


export default {
  async fetch(request, env, ctx): Promise<Response> {
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
    const pathParts = pathname.split('/').filter(part => part !== '');
    const groupsIndex = pathParts.indexOf('groups');

    if (groupsIndex !== -1 && pathParts.length >= groupsIndex + 2) {
      const groupId = pathParts[groupsIndex + 1];
      const action = pathParts[groupsIndex + 2];

      const routeKey = `${request.method}:/groups/${action}`;
      const illegal: boolean = routes[routeKey] === undefined;

      if (illegal) {
        return new Response('403 Forbidden', { status: 403 });
      }
      return routes[routeKey](request, env, groupId);
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