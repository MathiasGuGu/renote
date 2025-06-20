import {
  AnyPropertyValue,
  Cover,
  Icon,
  NotionErrorResponse,
  Parent,
  User,
} from "./types";

// Base types
export interface User {
  object: "user";
  id: string;
  name?: string;
  avatar_url?: string;
  type?: "person" | "bot";
  person?: {
    email: string;
  };
  bot?: {
    owner: {
      type: "workspace" | "user";
      workspace?: boolean;
      user?: Partial<User>;
    };
    workspace_name?: string;
  };
}

export interface Parent {
  type: "database_id" | "page_id" | "workspace";
  database_id?: string;
  page_id?: string;
  workspace?: boolean;
}

export interface Cover {
  type: "external" | "file";
  external?: {
    url: string;
  };
  file?: {
    url: string;
    expiry_time: string;
  };
}

export interface Icon {
  type: "emoji" | "external" | "file";
  emoji?: string;
  external?: {
    url: string;
  };
  file?: {
    url: string;
    expiry_time: string;
  };
}

// Rich text types
export interface RichTextAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color:
    | "default"
    | "gray"
    | "brown"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "red"
    | "gray_background"
    | "brown_background"
    | "orange_background"
    | "yellow_background"
    | "green_background"
    | "blue_background"
    | "purple_background"
    | "pink_background"
    | "red_background";
}

export interface RichTextText {
  type: "text";
  text: {
    content: string;
    link: {
      url: string;
    } | null;
  };
  annotations: RichTextAnnotations;
  plain_text: string;
  href: string | null;
}

export interface RichTextMention {
  type: "mention";
  mention: {
    type:
      | "user"
      | "page"
      | "database"
      | "date"
      | "link_preview"
      | "template_mention";
    user?: Partial<User>;
    page?: { id: string };
    database?: { id: string };
    date?: {
      start: string;
      end?: string;
      time_zone?: string;
    };
    link_preview?: { url: string };
    template_mention?: {
      type: "template_mention_date" | "template_mention_user";
      template_mention_date?: "today" | "now";
      template_mention_user?: "me";
    };
  };
  annotations: RichTextAnnotations;
  plain_text: string;
  href: string | null;
}

export interface RichTextEquation {
  type: "equation";
  equation: {
    expression: string;
  };
  annotations: RichTextAnnotations;
  plain_text: string;
  href: string | null;
}

export type RichText = RichTextText | RichTextMention | RichTextEquation;

// Property value types
export interface SelectOption {
  id: string;
  name: string;
  color:
    | "default"
    | "gray"
    | "brown"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "red";
}

export interface DateValue {
  start: string;
  end?: string | null;
  time_zone?: string | null;
}

export interface FileValue {
  type: "external" | "file";
  name: string;
  external?: {
    url: string;
  };
  file?: {
    url: string;
    expiry_time: string;
  };
}

export interface FormulaValue {
  type: "string" | "number" | "boolean" | "date";
  string?: string | null;
  number?: number | null;
  boolean?: boolean | null;
  date?: DateValue | null;
}

export interface RollupValue {
  type: "number" | "date" | "array";
  number?: number | null;
  date?: DateValue | null;
  array?: Array<any>;
  function:
    | "count"
    | "count_values"
    | "count_unique_values"
    | "count_all"
    | "count_per_group"
    | "percent_empty"
    | "percent_not_empty"
    | "sum"
    | "average"
    | "median"
    | "min"
    | "max"
    | "range"
    | "earliest_date"
    | "latest_date"
    | "date_range"
    | "checked"
    | "not_checked"
    | "percent_checked"
    | "percent_not_checked"
    | "show_original"
    | "show_unique";
}

// Property value interfaces
export interface PropertyValue {
  id: string;
  type: string;
}

export interface TitlePropertyValue extends PropertyValue {
  type: "title";
  title: RichText[];
}

export interface RichTextPropertyValue extends PropertyValue {
  type: "rich_text";
  rich_text: RichText[];
}

export interface NumberPropertyValue extends PropertyValue {
  type: "number";
  number: number | null;
}

export interface SelectPropertyValue extends PropertyValue {
  type: "select";
  select: SelectOption | null;
}

export interface MultiSelectPropertyValue extends PropertyValue {
  type: "multi_select";
  multi_select: SelectOption[];
}

export interface DatePropertyValue extends PropertyValue {
  type: "date";
  date: DateValue | null;
}

export interface PeoplePropertyValue extends PropertyValue {
  type: "people";
  people: User[];
}

export interface FilesPropertyValue extends PropertyValue {
  type: "files";
  files: FileValue[];
}

export interface CheckboxPropertyValue extends PropertyValue {
  type: "checkbox";
  checkbox: boolean;
}

export interface UrlPropertyValue extends PropertyValue {
  type: "url";
  url: string | null;
}

export interface EmailPropertyValue extends PropertyValue {
  type: "email";
  email: string | null;
}

export interface PhoneNumberPropertyValue extends PropertyValue {
  type: "phone_number";
  phone_number: string | null;
}

export interface FormulaPropertyValue extends PropertyValue {
  type: "formula";
  formula: FormulaValue;
}

export interface RelationPropertyValue extends PropertyValue {
  type: "relation";
  relation: Array<{ id: string }>;
  has_more: boolean;
}

export interface RollupPropertyValue extends PropertyValue {
  type: "rollup";
  rollup: RollupValue;
}

export interface CreatedTimePropertyValue extends PropertyValue {
  type: "created_time";
  created_time: string;
}

export interface CreatedByPropertyValue extends PropertyValue {
  type: "created_by";
  created_by: User;
}

export interface LastEditedTimePropertyValue extends PropertyValue {
  type: "last_edited_time";
  last_edited_time: string;
}

export interface LastEditedByPropertyValue extends PropertyValue {
  type: "last_edited_by";
  last_edited_by: User;
}

type AnyPropertyValue =
  | TitlePropertyValue
  | RichTextPropertyValue
  | NumberPropertyValue
  | SelectPropertyValue
  | MultiSelectPropertyValue
  | DatePropertyValue
  | PeoplePropertyValue
  | FilesPropertyValue
  | CheckboxPropertyValue
  | UrlPropertyValue
  | EmailPropertyValue
  | PhoneNumberPropertyValue
  | FormulaPropertyValue
  | RelationPropertyValue
  | RollupPropertyValue
  | CreatedTimePropertyValue
  | CreatedByPropertyValue
  | LastEditedTimePropertyValue
  | LastEditedByPropertyValue;

// Main Page response type
export interface NotionPageResponse {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: User;
  last_edited_by: User;
  cover: Cover | null;
  icon: Icon | null;
  parent: Parent;
  archived: boolean;
  properties: Record<string, AnyPropertyValue>;
  url: string;
  public_url: string | null;
}

// Error response types
export interface NotionErrorResponse {
  object: "error";
  status: number;
  code: string;
  message: string;
  developer_survey?: string;
  request_id?: string;
}

// Union type for the complete response
export type RetrievePageResponse = NotionPageResponse | NotionErrorResponse;
