import { readConfig, setUser } from "../config";
import { getSystemErrorMessage } from "node:util";
import { getUser, createUser, deleteUsers, getUsers } from "../lib/db/queries/users.js"
import { Agent } from "node:http";
import { XMLParser } from "fast-xml-parser";
import { resourceLimits } from "node:worker_threads";
import { url } from "node:inspector";
import { db } from "src/lib/db";
import {feeds, Feed, User, feedFollows} from "src/lib/db/schema";
import { getFeeds, getFeedsByURL } from "src/lib/db/queries/feeds";
import { createFeedFollow, deleteFeedFollow, getFeedFollowsForUser } from "./feedFollows";
import {eq, sql} from "drizzle-orm";
import { createPost, getPostsForUser } from "./posts";


export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
    return async(cmdName:string, ...args: string[]) => {
    const cfg = await readConfig();
    const currentUser = cfg.currentUserName;
    if(!currentUser){throw new Error("current user not set");}
    const user = await getUser(currentUser);
    await handler(cmdName, user, ...args);
    };

}

export async function registerCommand(registry: CommandsRegistry, cmdName: string, handler:CommandHandler): Promise<void>{
    if(registry[cmdName]){
        throw new Error(`Command: "${cmdName}" is already registered.`);
    }
    registry[cmdName] = handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]): Promise<void>{
    if(!registry[cmdName]){
        throw new Error("The command does not exist");
    }
    const handler = registry[cmdName];
    await handler(cmdName, ...args);
}

export async function handlerReset(cmdName: string, ...args:string[]): Promise<void>{
    console.log("Deleting user");
    await deleteUsers();
    console.log("The table has been reset your highness");
}

export async function handlerAddFeed(cmdName:string, user:User,  ...args:string[]): Promise<void>{

    if(args.length < 2 || args.length >2){
        console.log("addFeed command takes 2 arguments (name and url)");
        process.exit(1);
    }

    const [name, url] = args;
    const feed = await createFeed(name, url, user.id);
    //console.log(`THIS IS MY TEST ${user.id}`);

    await printFeed(feed, user)

    await createFeedFollow({ userId: user.id, feedId: feed.id });
}

export async function printFeed(feed: Feed, user: User){
    console.log("Feed:");
    console.log(`  id: ${feed.id}`);
    console.log(`  createdAt: ${feed.createdAt}`);
    console.log(`  updatedAt: ${feed.updatedAt}`);
    console.log(`  name: ${feed.name}`);
    console.log(`  url: ${feed.url}`);
    console.log(`  added by user: ${user.name}`);
}

export async function handlerFeeds(cmdName: string, ...args:string[]): Promise<void>{
    const feeds = await getFeeds();

    for(const feed of feeds){
        console.log(feed.name);
        console.log(feed.url);
        console.log(feed.username);
    }
}

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void>{
    if(args.length !== 1){
        throw new Error("Login expects a single argument -> username");
    }
    const [user] = args;
    if(user === "unknown"){
        console.log("uknown is not a valid user");
        process.exit(1);
    }
    setUser(args[0]);
    console.log("Username has been set");

}

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void>{
    if(args.length < 1){
        throw new Error("Command expects a name to register");
    }
    //const user = args[0];
    const [user] = args;
    const result = await getUser(user);
    if(result === undefined){
        await createUser(user);
    }
    else{
        console.log(`User ${user} already exists`);
        process.exit(1);
    }

    setUser(user);
    console.log("Username has been set in gatorconfig.");
}

export async function handlerUsers(cmdName: string, ...args: string[]): Promise<void>{
    let users = await getUsers();

    const cfg = await readConfig();
    const currentUser = cfg.currentUserName;

    for(const user of users){
        if(user.name === currentUser){
            console.log(`* ${user.name} (current)`);
            continue;
        }
        console.log(`* ${user.name}`);
    }
}

export async function handlerAgg(cmdName: string, ...args: string[]): Promise<void>{

  const durationStr = args[0];

  if (!durationStr) {
    console.log("Usage: agg <time_between_reqs>");
    return;
  }

  const timeBetweenRequests = parseDuration(durationStr);

  console.log(`Collecting feeds every ${durationStr}`);

  // Run immediately
  scrapeFeeds().catch(handleError);

  // Then repeat
  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  // Keep process alive + handle Ctrl+C
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nStopping feed scraper...");
      clearInterval(interval);
      resolve();
    });
  });
}

export async function handlerFollow(cmdName: string, user:User, ...args:string[]): Promise<void>{
    const [url] = args;
    if (!url) {
        throw new Error("url argument required");
    }

    const feedByURL = await getFeedsByURL(url);
    if(!feedByURL){
        throw new Error("URL does not exist");
    }
    const feedFollow = await createFeedFollow({userId: user.id, feedId: feedByURL.id});

    console.log(feedFollow.feedName);
    console.log(feedFollow.userName);
}

export async function handlerFollowing(cmdName:string, user:User, ...args:string[]): Promise<void>{
    const follows = await getFeedFollowsForUser({userId: user.id});
    for(const feed of follows){
        console.log(feed.feedName);
    } 
}

export async function handlerUnfollow(cmdName: string, user: User, ...args:string[]): Promise<void>{
    // accepts a URL as an argument then calls the delete function in feedFollows.ts
    const [url] = args;
    if (!url) {
        throw new Error("url argument required");
    }

    const feedByURL = await getFeedsByURL(url);
    if(!feedByURL){
        throw new Error("URL does not exist");
    }

    await deleteFeedFollow({userId: user.id, feedId: feedByURL.id});
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const limitArg = args[0];

  const limit = limitArg ? parseInt(limitArg) : 2;

  const posts = await getPostsForUser(user.id, limit);

  console.log(posts)

  for (const post of posts) {
    console.log(`
Title: ${post.title}
URL: ${post.url}
Published: ${post.publishedAt ? new Date(post.publishedAt).toISOString() : "unknown"}
    `);
  }
}

export async function fetchFeed(feedURL: string){
    const response = await fetch(feedURL,  {
        headers: {
            "User-Agent": "gator-cli"
        }
    });
    if(!response.ok){
        throw new Error(`Request failed: ${response.status}`);
    }
    const text = await response.text();
    
    const parseOBJ =  new XMLParser();

    const result = parseOBJ.parse(text);

    if(!result.rss?.channel){
        throw new Error("Channel doesn't exist when trying to fetchFeed");
    }

    const {title, link, description } = result.rss?.channel;
    if(!title || !link || !description){
        throw new Error("Missing title, link, or description from fetchFeed result");
    }

    const rawItems = result.rss?.channel?.item;

    let items = [];

    if (rawItems) {
    items = Array.isArray(rawItems) ? rawItems : [rawItems];
    } else {
    items = [];
    }

    const feedItems = [];
    for(const item of items){
        console.log(item);
        const { title, link, description, pubDate } = item;

        if(!title || !link ){
            continue;
        }
        feedItems.push({title, link, description,pubDate});
    }

    const feed = {
        channel: {
            title,
            link,
            description,
            item: feedItems,
        }
    };
    return feed;

}

export async function markFeedFetched(feedID: string){
    await db
        .update(feeds)
        .set({
            updatedAt: new Date(),
            lastFetchedAt: new Date(),
        })
        .where(eq(feeds.id, feedID));
}

export async function getNextFeedToFetch() {
  const result = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);

  return result[0] ?? null;
}

export async function scrapeFeeds() {
  // 1. Get next feed
  const feed = await getNextFeedToFetch();

  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  // 2. Mark as fetched (prevents duplicates in simple setups)
  await markFeedFetched(feed.id);

  // 3. Fetch the feed data
  const feedData = await fetchFeed(feed.url);

  // 4. Iterate and print titles
  for (const item of feedData.channel.item) {
    await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt: parseDate(item.pubDate),
      feedID: feed.id,
    });
  }

  console.log(`Finished scraping: ${feed.name}`);
}

function parseDate(dateString?: string): Date {
  if (!dateString) return new Date();

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}

export async function createFeed(name: string, url: string, userId: string){
    const [feed] = await db
        .insert(feeds)
        .values({
            name: name,
            url: url,
            userId: userId,
        })
        .returning();

    return feed;
}

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(`Invalid duration: ${durationStr}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 1000 * 60;
    case "h":
      return value * 1000 * 60 * 60;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

export function handleError(err: unknown) {
  console.error("Error occurred:", err);
}