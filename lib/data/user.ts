import { eq } from "drizzle-orm";
import { db } from "../db/config";
import { users } from "../db/schema";
import { UsersDatabaseReturn } from "../db/types";

export async function userExists(clerkId: string): Promise<boolean> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user.length > 0;
}

export async function createUser(user: {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const newUser = await db.insert(users).values(user).returning();
  return newUser;
}

export async function getUserByClerkId(
  clerkId: string
): Promise<UsersDatabaseReturn | null> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user[0];
}
