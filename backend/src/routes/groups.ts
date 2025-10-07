export async function handleGetInfo(
  request: Request,
  env: Env,
): Promise<Response> {
  return new Response('Group info');
}
