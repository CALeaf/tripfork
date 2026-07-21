import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    destination: text("destination").notNull(),
    summary: text("summary").notNull(),
    dataJson: text("data_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("trips_owner_updated_idx").on(table.ownerId, table.updatedAt)],
);

export const guides = sqliteTable(
  "guides",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    destination: text("destination").notNull(),
    author: text("author").notNull(),
    summary: text("summary").notNull(),
    dataJson: text("data_json").notNull(),
    publishedAt: text("published_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("guides_published_idx").on(table.publishedAt)],
);
