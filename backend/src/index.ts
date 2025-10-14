import { handleGetInfo, handlePostCreate } from './routes/groups.js';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    console.log('Request received:', request.method, request.url);

    if (request.url.split('/')[3] === "groups"){
      const groupId = request.url.split('/')[4];
      var illegal: boolean = routes[`${request.method}:/groups/${request.url.split('/')[5]}`] == undefined;

      if (illegal) {
        return new Response('403 Forbidden', { status: 403 });
      }
      return routes[`${request.method}:/groups/${request.url.split('/')[5]}`](request, env, groupId);
    }
    
    return new Response('404 Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

const routes: Record<
  string,
  (
    request: Request,
    env: Env,
    groupId: string
  ) => Promise<Response>
> = {
  'GET:/groups/info': handleGetInfo,
  'POST:/groups/create': handlePostCreate,
};