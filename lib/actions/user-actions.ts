"use server";
import {
  getNotionDatabaseByClerkId,
  getUserByClerkId,
  getUserOrCreate,
} from "../data/queries";

export async function ensureUserExists(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  return await getUserOrCreate({
    ...userData,
  });
}

export async function getUserDatabases() {
  const user = await getNotionDatabaseByClerkId();
  if (!user) {
    throw new Error("User not found");
  }
}
