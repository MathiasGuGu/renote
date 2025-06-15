import { 
  AnyPropertyValue,
  Cover,
  Icon,
  RichText,
  User
} from "./types";

export interface NotionDatabaseQueryResponse {
  object: "list";
  results: Array<NotionPage | NotionDatabase>;
  next_cursor: string | null;
  has_more: boolean;
  type: "page_or_database";
  page_or_database: {};
}

export interface NotionPage {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: User;
  last_edited_by: User;
  cover?: Cover;
  icon?: Icon;
  parent: {
    type: "database_id";
    database_id: string;
  };
  archived: boolean;
  properties: {
    [propertyName: string]: AnyPropertyValue;
  };
  url: string;
}

export interface NotionDatabase {
  object: "database";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: User;
  last_edited_by: User;
  title: RichText[];
  description: RichText[];
  icon?: Icon;
  cover?: Cover;
  properties: {
    [propertyName: string]: any; // Database property schemas
  };
  parent: {
    type: "page_id";
    page_id: string;
  };
  url: string;
  archived: boolean;
}