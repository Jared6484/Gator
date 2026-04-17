import { fromCamel } from "postgres";
import { db } from "..";
import { feeds, users } from "../schema";
import {eq} from "drizzle-orm";


export async function getFeeds(){
    const results = await db
        //.select()
        //.from(feeds);
        .select({
            id: feeds.id,
            name: feeds.name,
            url: feeds.url,
            createdAt: feeds.createdAt,
            updatedAt: feeds.updatedAt,
            username: users.name,
        })
        .from(feeds)
        .innerJoin(users, eq(feeds.userId, users.id));
        

    return results;
}

export async function getFeedsByURL(url: string){
    const [feedResults] = await db
        .select()
        .from(feeds)
        .where(eq(feeds.url, url));

    return feedResults;
}