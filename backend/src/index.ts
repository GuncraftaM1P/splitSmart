import { handleGetInfo, handlePostCreate } from './routes/groups.js';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(part => part !== '');

    // Handle both /groups/... and /api/groups/... patterns
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