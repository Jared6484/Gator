import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
    dbUrl: string,
    currentUserName?: string,
};

export function setUser(userName: string): void{
    const config = readConfig();

    config.currentUserName = userName;

    writeConfig(config);
}

export function readConfig(): Config{
    const filePath = getConfigFilePath();

    const fileContents = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContents);
    return validateConfig(parsed);
}

function getConfigFilePath():string {
    //console.log(path.join(os.homedir(), "Gator/.gatorconfig.json"));  -- this breaks if code is cloned somewhere else.
    //console.log(path.join(process.cwd(), ".gatorconfig.json"));  -- process.cwd() shows runtime location
    //console.log(path.join(__dirname, ".gatorconfig.json"));  -- __dirname shows file location. You have to create it if using type:"module". 
    return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void{
    const filePath = getConfigFilePath();

    const rawConfig = {
        db_url: cfg.dbUrl,
        current_user_name: cfg.currentUserName,
    };
    fs.writeFileSync(filePath, JSON.stringify(rawConfig, null, 2));
}

function validateConfig(rawConfig: any): Config{
    if(!rawConfig || typeof rawConfig !== "object"){
        throw new Error("Invalid config: not an object");
    }

    if(typeof rawConfig.db_url != "string"){
        throw new Error("Invalid config: db_url must be a string");
    }

    if(
        rawConfig.current_user_name &&
        typeof rawConfig.current_user_name !== "string"
    ){
        throw new Error("Invalid config: current_user_name must be a string")
    }
    return {
        dbUrl: rawConfig.db_url,
        currentUserName: rawConfig.current_user_name,
    };
}