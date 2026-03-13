import { readConfig, setUser } from "../config";
import { getSystemErrorMessage } from "node:util";
import {getUser, createUser, deleteUsers, getUsers } from "../lib/db/queries/users.js"
import { Agent } from "node:http";
import { XMLParser } from "fast-xml-parser";
import { resourceLimits } from "node:worker_threads";
import { url } from "node:inspector";
import { db } from "src/lib/db";
import {feeds, Feed, User, feedFollows} from "src/lib/db/schema";
import { getFeeds, getFeedsByURL } from "src/lib/db/queries/feeds";
import { createFeedFollow, getFeedFollowsForUser } from "./feedFollows";


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

export async function handlerAddFeed(cmdName:string, user:string,  ...args:string[]): Promise<void>{
    const cfg = await readConfig();
    const currentUser = cfg.currentUserName;
    if(!currentUser){throw new Error("current user not set");}
    const user = await getUser(currentUser);  // user is now the row from the Db.

    if(!user){
        throw new Error("No current user is set"); 
    }

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

    const url = "https://www.wagslane.dev/index.xml"
    const file = await fetchFeed(url);
    console.log(file);
}

export async function handlerFollow(cmdName: string, ...args:string[]): Promise<void>{
    const [url] = args;
    if (!url) {
        throw new Error("url argument required");
    }

    const cfg = await readConfig();
    if (!cfg.currentUserName) {
        throw new Error("no user logged in");
    }
    const user = await getUser(cfg.currentUserName);

    const feedByURL = await getFeedsByURL(url);
    if(!feedByURL){
        throw new Error("URL does not exist");
    }
    const feedFollow = await createFeedFollow({userId: user.id, feedId: feedByURL.id});

    console.log(feedFollow.feedName);
    console.log(feedFollow.userName);
}

export async function handlerFollowing(cmdName:string, ...args:string[]): Promise<void>{
    const cfg = await readConfig();
    if (!cfg.currentUserName) {
        throw new Error("no user logged in");
    }
    const user = await getUser(cfg.currentUserName);

    const follows = await getFeedFollowsForUser({userId: user.id});
    for(const feed of follows){
        console.log(feed.feedName);
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
    


    let items = [];

    if(result.rss?.channel.item){
        if(Array.isArray(result.rss?.channel.items)){
            items = result.rss?.channel.item;
        } else{
            items = [result.rss?.channel.item];
        }
    } else{
        items = [];
    }

    const feedItems = [];
    for(const item of items){
        console.log(item);
        const { title, link, description, pubDate } = item;

        if(!title || !link || !pubDate){
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

