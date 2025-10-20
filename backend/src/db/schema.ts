import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const groupsTable = sqliteTable("groups", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    members: text("members", { mode: "json" })
        .notNull()
        .$type<string[]>()
        .default(sql`'[]'`),

    expenses: text("expenses", { mode: "json" })
        .notNull()
        .$type<{
            id: number;
            description: string;
            amount: number;
            paidBy: string;
            paidFor: string[];
        }[]>()
        .default(sql`'[]'`),
});
