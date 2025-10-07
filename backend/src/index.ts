import handleGetInfo from './routes/groups.js';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    console.log('Request received:', request.method, request.url);
  },
} satisfies ExportedHandler<Env>;
