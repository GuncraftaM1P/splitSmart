//handlePostCreate funktion entwickeln
//bei schema.ts aufbau von expenisves abshauen
//in index.ts importieren

//den endpunkt in openAPi.json dokumentieen


import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { groupsTable } from '../db/schema';
import { v4 as uuidv4 } from 'uuid'; // optional für eindeutige IDs

// Das beschreibt den Aufbau des Bodys, der vom Client (z. B. React Native App) gesendet wird
interface ExpenseBody {
  description: string;
  amount: number;
  paidBy: string;
  paidFor: string[];
}

export async function handlePatchUpdate(
  request: Request,
  env: Env,
  groupId: string,
): Promise<Response> {
  const db = drizzle(env.prod_db);

  // 1️⃣ Gruppe prüfen
  const group = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .get();

  if (!group) {
    return new Response('Group not found', { status: 404 });
  }

  // 2️⃣ Request-Body auslesen & typisieren
  const body = (await request.json()) as ExpenseBody;

  // 3️⃣ Eingabe prüfen
  if (!body.description || !body.amount || !body.paidBy || !body.paidFor) {
    return new Response('Missing fields', { status: 400 });
  }

  // Betrag prüfen
  if (isNaN(Number(body.amount))) {
    return new Response('Amount must be a number', { status: 400 });
  }

  // 4️⃣ Alte expenses holen und neuen Eintrag hinzufügen
  const expenses = group.expenses;

  const newExpense = {
    id: expenses.length + 1, // eindeutige ID für jede Ausgabe (alternativ: expenses.length + 1)
    description: body.description,
    amount: Number(body.amount),
    paidBy: body.paidBy,
    paidFor: body.paidFor,
  };

  expenses.push(newExpense);

  // 5️⃣ Datenbank aktualisieren
  await db
    .update(groupsTable)
    .set({ expenses }) 
    .where(eq(groupsTable.id, groupId));

  // 6️⃣ Erfolgsmeldung zurückgeben
  return new Response(JSON.stringify(newExpense), { status: 201 });
  //return new Response(`Created group with id: ${groupId}`, { status: 201 });
}
