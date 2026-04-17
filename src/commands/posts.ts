import { db } from "src/lib/db";
import { feedFollows, posts } from "../lib/db/schema"; 
import { desc, eq } from "drizzle-orm";



export async function createPost(data: {
    title?: string;
    url: string;
    description?: string;
    publishedAt: Date;
    feedID: string;
}) {
    console.log("CREATE POST CALLED:", data.url);
    const result = await db
        .insert(posts)
        .values({
            title: data.title,
            url:data.url,
            description: data.description,
            publishedAt: data.publishedAt,
            feedID: data.feedID,
        })
        .returning();
    
    return result;
}

export async function getPostsForUser(userId: string, limit =2){
    return await db
        .select({
            id: posts.id,
            title: posts.title,
            url:posts.url,
            description: posts.description,
            publishedAt: posts.publishedAt,
        })
        .from(posts)
        .innerJoin(feedFollows, eq(posts.feedID, feedFollows.feedId))
        .where(eq(feedFollows.userId, userId))
        .orderBy(desc(posts.publishedAt))
        .limit(limit); 
}
