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
  // Ensure table exists to avoid "no such table" errors in dev
  try {
    await env.prod_db
      .prepare(
        `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members TEXT NOT NULL DEFAULT '[]',
        expenses TEXT NOT NULL DEFAULT '[]'
      )`,
      )
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to ensure groups table: ${message}`, {
      status: 500,
    });
  }

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

const adjectives = [
  'Brave',
  'Clever',
  'Swift',
  'Gentle',
  'Fierce',
  'Quiet',
  'Loyal',
  'Wild',
  'Curious',
  'Bold',
];
const animals = [
  'Lion',
  'Fox',
  'Eagle',
  'Wolf',
  'Bear',
  'Tiger',
  'Owl',
  'Rabbit',
  'Dolphin',
  'Panda',
];

export async function handlePostCreate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  if (!validate(groupId) || version(groupId) !== 4) {
    return new Response('Invalid UUID v4', { status: 400 });
  }
  // Ensure the D1 table exists in development/local environments. If it doesn't,
  // creating it here avoids query failures like "no such table: groups".
  try {
    // Create table if missing (columns mirror the drizzle schema types)
    await env.prod_db
      .prepare(
        `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members TEXT NOT NULL DEFAULT '[]',
        expenses TEXT NOT NULL DEFAULT '[]'
      )`,
      )
      .run();
  } catch (err) {
    // If creating the table failed, return a clear error for debugging.
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to ensure groups table: ${message}`, {
      status: 500,
    });
  }

  const db = drizzle(env.prod_db);

  try {
    const existing = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId))
      .get();
    if (existing) {
      return new Response('Group already exists', { status: 409 });
    }

    await db.insert(groupsTable).values({
      id: groupId,
      name:
        adjectives[Math.floor(Math.random() * adjectives.length)] +
        ' ' +
        animals[Math.floor(Math.random() * animals.length)],
    });

    return new Response(`Created group with id: ${groupId}`, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to create group: ${message}`, { status: 500 });
  }
}

export async function handlePatchUpdate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
  } | null;
  if (!payload || typeof payload !== 'object') {
    return new Response('Invalid JSON payload', { status: 400 });
  }

  const updates: { name?: string; description?: string } = {};
  if (typeof payload.name === 'string') {
    const trimmedName = payload.name.trim();
    if (trimmedName.length === 0) {
      return new Response('Name cannot be empty', { status: 400 });
    }
    if (trimmedName.length > 30) {
      return new Response('Name must be at most 30 characters', {
        status: 400,
      });
    }
    updates.name = trimmedName;
  }
  if (typeof payload.description === 'string') {
    if (payload.description.length > 200) {
      return new Response('Description must be at most 200 characters', {
        status: 400,
      });
    }
    updates.description = payload.description;
  }

  if (Object.keys(updates).length === 0) {
    return new Response('Nothing to update', { status: 400 });
  }

  const db = drizzle(env.prod_db);
  const result = await db
    .update(groupsTable)
    .set(updates)
    .where(eq(groupsTable.id, groupId));

  return new Response('Group updated', { status: 200 });
}

export async function handleDelete(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  if (!validate(groupId) || version(groupId) !== 4) {
    return new Response('Invalid UUID v4', { status: 400 });
  }
  try {
    await env.prod_db
      .prepare(
        `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members TEXT NOT NULL DEFAULT '[]',
        expenses TEXT NOT NULL DEFAULT '[]'
      )`,
      )
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to ensure groups table: ${message}`, {
      status: 500,
    });
  }

  const db = drizzle(env.prod_db);
  try {
    const existing = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId))
      .get();
    if (!existing) {
      return new Response('Group not found', { status: 404 });
    }
    await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to delete group: ${message}`, { status: 500 });
  }
}
