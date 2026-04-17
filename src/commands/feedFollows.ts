import { db } from "src/lib/db";
import { feedFollows, feeds, users } from "../lib/db/schema";
import {and, eq} from "drizzle-orm";


export async function createFeedFollow({userId, feedId}: {userId:string, feedId: string}){
    const [newFeedFollow] = await db
        .insert(feedFollows)
        .values({
            userId: userId,
            feedId: feedId,
        
        })
        .returning();

    const [feedFollow] = await db
        .select({
            id: feedFollows.id,
            createdAt: feedFollows.createdAt,
            updatedAt: feedFollows.updatedAt,
            userId: feedFollows.userId,
            feedId: feedFollows.feedId,
            feedName: feeds.name,
            userName: users.name,

        })
        .from(feedFollows)
        .innerJoin(users, eq(feedFollows.userId, users.id))
        .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
        .where(eq(feedFollows.id, newFeedFollow.id));

    return feedFollow;

}

export async function getFeedFollowsForUser({userId}: {userId:string}){
    const userFeedFollows = await db
        .select({
            userName: users.name,
            feedName: feeds.name,
}       )
        .from(feedFollows)
        .innerJoin(users, eq(feedFollows.userId, users.id))
        .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
        .where(eq(feedFollows.userId, userId));

    return userFeedFollows;
}

export async function deleteFeedFollow({userId, feedId}: {userId:string, feedId: string}){
    await db
        .delete(feedFollows)
        .where(
            and(
                eq(feedFollows.userId, userId),
                eq(feedFollows.feedId, feedId)
            )
            
        );

}