import { drizzle } from 'drizzle-orm/d1';
import { groups } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function handleGetInfo(
  request: Request,
  env: Env,
  groupId: string
): Promise<Response> {
  const db = drizzle(env.prod_db);
  const group = await db.select().from(groups).where(eq(groups.id, groupId)).get();

  if (!group) {
    return new Response("Group not found", { status: 404, headers: { 'Content-Type': 'text/plain', "Access-Control-Allow-Origin": "*" } })
  }

  return Response.json(group, { status: 200, headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" } })
}


export async function handlePostCreate(
  request: Request,
  env: Env,
  groupId: string
): Promise<Response> {
  const db = drizzle(env.prod_db);
  await db.insert(groups).values({ id: groupId, name: "New Group", description: "This is a new group", members: "[]", expenses: "[]" }).run();

  return new Response(`I created the group with id: ${groupId}`);
}