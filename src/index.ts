import { exit } from "process";
//import { setUser, readConfig } from "../config";
import { CommandsRegistry, handlerLogin, registerCommand, runCommand, handlerRegister, handlerReset } from "./commands/commands";

async function main() {
  //setUser("Jared");

  //const config = readConfig();

  //console.log("Updated config:");
  //console.log(config);

  let registry: CommandsRegistry = {};
  //registry["login"] = handlerLogin;
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);

  let cmdLine = process.argv;
  let cutCmdLine: string[] = cmdLine.slice(2);
  if(cutCmdLine.length === 0){
    throw new Error("Not enough arguments were provided");
    //process.exit(1); 
  }
  const cmd = cutCmdLine[0];
  const cmdLineArgs: string[] = cutCmdLine.slice(1);

  try{
    await runCommand(registry, cmd, ...cmdLineArgs);
  } catch (e){
    console.log(`Error occured: ${e}`);
  }
  process.exit(0);
}

main();
//main().catch((e) => {  %%%%% Top level error handling. Research why this is necessary?
//  console.error(`Error occurred: ${e.message}`);
//  process.exit(1);
//});