"use server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrCreate } from "../data/queries";

export async function ensureUserExists(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }
  return await getUserOrCreate({
    clerkId,
    ...userData,
  });
}
