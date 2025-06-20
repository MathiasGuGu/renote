import { eq } from "drizzle-orm";
import { db } from "../../db/config";
import { users } from "../../db/schema";
import { auth } from "@clerk/nextjs/server";

export async function createUser(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }
  return await db.insert(users).values({
    clerkId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    imageUrl: userData.imageUrl,
  });
}

export async function getUserIdByClerkId(
  clerkId: string
): Promise<string | undefined> {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    columns: {
      id: true,
    },
  });
  return user?.id;
}

export async function updateUser() {}
export async function deleteUser() {}

export async function getUserOrCreate(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }
  const user = await getUserIdByClerkId(clerkId);
  if (!user) {
    return await createUser({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      imageUrl: userData.imageUrl,
    });
  }
  return user;
}
