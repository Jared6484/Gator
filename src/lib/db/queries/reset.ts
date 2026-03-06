



export async function reset(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  //--The above syntax is almost identical to --> INSERT INTO <table> (<columns>) VALUES (<values>) RETURNING *;
  return result;
}