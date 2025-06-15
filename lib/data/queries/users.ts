import { eq } from "drizzle-orm";
import { db } from "../../db/config";
import { users } from "../../db/schema";
import type { User } from "../../integrations/notion/types";

export async function createUser(userData: {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      clerkId: userData.clerkId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      imageUrl: userData.imageUrl,
      preferences: {},
    })
    .returning();

  return { ...user, preferences: user.preferences || undefined };
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return user ? { ...user, preferences: user.preferences || undefined } : null;
}

export async function updateUser(
  clerkId: string,
  updates: Partial<Omit<User, "id" | "clerkId" | "createdAt" | "updatedAt">>
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId))
    .returning();

  return user ? { ...user, preferences: user.preferences || undefined } : null;
}

export async function deleteUser(clerkId: string): Promise<void> {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}

export async function getUserOrCreate(userData: {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}): Promise<User> {
  const existingUser = await getUserByClerkId(userData.clerkId);

  if (existingUser) {
    return existingUser;
  }

  return createUser(userData);
}
