import { setUser } from "../config";
import { getSystemErrorMessage } from "node:util";
import {getUser, createUser } from "../lib/db/queries/users.js"


export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export async function registerCommand(registry: CommandsRegistry, cmdName: string, handler:CommandHandler): void{
    if(registry[cmdName]){
        throw new Error(`Command: "${cmdName}" is already registered.`);
    }
    registry[cmdName] = handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]): void{
    if(!registry[cmdName]){
        throw new Error("The command does not exist");
    }
    const handler = registry[cmdName];
    await handler(cmdName, ...args);
}


export async function handlerLogin(cmdName: string, ...args: string[]): void{
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

