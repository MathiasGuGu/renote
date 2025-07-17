import { createUser, userExists } from "../data/user";

export async function ensureUserExists(user: {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const exists = await userExists(user.clerkId);
  if (!exists) {
    await createUser(user);
  } else {
    return exists;
  }
}
