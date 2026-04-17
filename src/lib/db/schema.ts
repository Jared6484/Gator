import { dateDuration } from "drizzle-orm/gel-core";
import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";
import { url } from "node:inspector";


export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: text("name").notNull(),
    url: text("url")
        .notNull()
        .unique(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {onDelete: "cascade"}),
    lastFetchedAt: timestamp("last_fetched_at"),
});

export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

export const feedFollows = pgTable("feed_follows", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {onDelete: "cascade"}),
    feedId: uuid("feed_id")
        .notNull()
        .references(() => feeds.id, {onDelete: "cascade"}),
})

export const posts = pgTable("posts", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt:timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    title: text("title"),
    url: text("url").notNull().unique(),
    description: text("description"),
    publishedAt: timestamp("published_at"),
    feedID: uuid("feed_id").notNull().references(() => feeds.id, {onDelete: "cascade"}),
})