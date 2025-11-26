//handlePostCreate funktion entwickeln
//bei schema.ts aufbau von expenisves abshauen
//in index.ts importieren

//den endpunkt in openAPi.json dokumentieen

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { groupsTable } from '../db/schema';
import { v7 as uuidv7 } from 'uuid'; // optional für eindeutige IDs

// Das beschreibt den Aufbau des Bodys, der vom Client (z. B. React Native App) gesendet wird
interface ExpenseBody {
  description: string;
  amount: number;
  paidBy: string;
  paidFor: string[];
}

export async function handleExpensesPostUpdate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  const db = drizzle(env.prod_db);

  const group = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .get();

  if (!group) {
    return new Response('Group not found', { status: 404 });
  }

  const body = (await request.json()) as ExpenseBody;

  if (!body.description || !body.amount || !body.paidBy || !body.paidFor) {
    return new Response('Missing fields', { status: 400 });
  }

  if (isNaN(Number(body.amount))) {
    return new Response('Amount must be a number', { status: 400 });
  }

  const expenses = group.expenses;

  const newExpense = {
    //id is uuidv7 (time sortable)
    id: uuidv7(),
    description: body.description,
    amount: Number(body.amount),
    paidBy: body.paidBy,
    paidFor: body.paidFor,
  };

  expenses.push(newExpense);

  await db
    .update(groupsTable)
    .set({ expenses })
    .where(eq(groupsTable.id, groupId));

  return new Response(JSON.stringify(newExpense), { status: 201 });
}
