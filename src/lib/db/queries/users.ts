import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  //--The above syntax is almost identical to --> INSERT INTO <table> (<columns>) VALUES (<values>) RETURNING *;
  return result;
}
// ************ [result] means take the first elemebt of the returned array and assign to result.

export async function getUser(name: string){
  const [result] = await db
  .select()
  .from(users)
  .where(eq(users.name, name));

  return result;
}

export async function deleteTable(){
  const result = await db
  .delete(users);
}
