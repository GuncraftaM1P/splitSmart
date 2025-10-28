import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { groupsTable } from '../db/schema';

import { validate, version } from 'uuid';

export async function handleGetInfo(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  const db = drizzle(env.prod_db);
  const result = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));

  if (result.length == 0) {
    return new Response('Group not found', {
      status: 404,
    });
  }

  return new Response(JSON.stringify(result[0]), {
    status: 200,
  });
}

export async function handlePostCreate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  if (!validate(groupId) || version(groupId) !== 4) {
    return new Response('Invalid UUID v4', { status: 400 });
  }

  const db = drizzle(env.prod_db);

  const existing = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .get();
  if (existing) {
    return new Response('Group already exists', { status: 409 });
  }

  await db.insert(groupsTable).values({ id: groupId, name: groupId });

  return new Response(`Created group with id: ${groupId}`, { status: 201 });
}

export async function handlePatchUpdate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  // Implementation for updating group details would go here
  return new Response('Not Implemented', { status: 501 });
}
