import { User } from "./types";

/**
 * Base user object structure
 */
export interface BaseUser extends User {}

/**
 * Person user type - represents a real person
 */
export interface PersonUser extends BaseUser {
  type: "person";
  person: {
    email?: string;
  };
}

/**
 * Bot user type - represents a bot/integration
 */
export interface BotUser extends BaseUser {
  type: "bot";
  bot: {
    owner: {
      type: "workspace";
      workspace: boolean;
    } | {
      type: "user";
      user: PersonUser;
    };
    workspace_name?: string;
  };
}

/**
 * Union type representing all possible user types returned by the API
 */
export type NotionUser = PersonUser | BotUser;

/**
 * Type guard to check if a user is a person
 */
export function isPersonUser(user: NotionUser): user is PersonUser {
  return user.type === "person";
}

/**
 * Type guard to check if a user is a bot
 */
export function isBotUser(user: NotionUser): user is BotUser {
  return user.type === "bot";
}

/**
 * API Response type for the GET /v1/users/{user_id} endpoint
 */
export type RetrieveUserResponse = NotionUser;