import { CreatedByPropertyValue, CreatedTimePropertyValue, EmailPropertyValue, FilesPropertyValue, LastEditedByPropertyValue, LastEditedTimePropertyValue, PhoneNumberPropertyValue } from "./types-page";

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
    created_time: string; // ISO 8601 datetime
    last_edited_time: string; // ISO 8601 datetime
    created_by: {
        object: "user";
        id: string;
    };
    last_edited_by: {
        object: "user";
        id: string;
    };
    cover?: {
        type: "external" | "file";
        external?: {
            url: string;
        };
        file?: {
            url: string;
            expiry_time: string;
        };
    };
    icon?: {
        type: "emoji" | "external" | "file";
        emoji?: string;
        external?: {
            url: string;
        };
        file?: {
            url: string;
            expiry_time: string;
        };
    };
    parent: {
        type: "database_id";
        database_id: string;
    };
    archived: boolean;
    properties: {
        [propertyName: string]: PropertyValue;
    };
    url: string;
}

// Properties can be various types - here are the main ones:
type PropertyValue =
    | TitleProperty
    | RichTextProperty
    | NumberProperty
    | SelectProperty
    | MultiSelectProperty
    | DateProperty
    | PeopleProperty
    | FilesPropertyValue
    | CheckboxProperty
    | UrlProperty
    | EmailPropertyValue
    | PhoneNumberPropertyValue
    | FormulaProperty
    | RelationProperty
    | RollupProperty
    | CreatedTimePropertyValue
    | CreatedByPropertyValue
    | LastEditedTimePropertyValue
    | LastEditedByPropertyValue;

export interface TitleProperty {
    id: string;
    type: "title";
    title: RichTextObject[];
}

export interface RichTextProperty {
    id: string;
    type: "rich_text";
    rich_text: RichTextObject[];
}

export interface NumberProperty {
    id: string;
    type: "number";
    number: number | null;
}

export interface SelectProperty {
    id: string;
    type: "select";
    select: {
        id: string;
        name: string;
        color: string;
    } | null;
}

export interface MultiSelectProperty {
    id: string;
    type: "multi_select";
    multi_select: Array<{
        id: string;
        name: string;
        color: string;
    }>;
}

export interface DateProperty {
    id: string;
    type: "date";
    date: {
        start: string;
        end: string | null;
        time_zone: string | null;
    } | null;
}

export interface PeopleProperty {
    id: string;
    type: "people";
    people: Array<{
        object: "user";
        id: string;
        name?: string;
        avatar_url?: string;
        type: "person" | "bot";
        person?: {
            email: string;
        };
    }>;
}

export interface CheckboxProperty {
    id: string;
    type: "checkbox";
    checkbox: boolean;
}

export interface UrlProperty {
    id: string;
    type: "url";
    url: string | null;
}

export interface FormulaProperty {
    id: string;
    type: "formula";
    formula: {
        type: "string" | "number" | "boolean" | "date";
        string?: string | null;
        number?: number | null;
        boolean?: boolean | null;
        date?: {
            start: string;
            end: string | null;
            time_zone: string | null;
        } | null;
    };
}

export interface RelationProperty {
    id: string;
    type: "relation";
    relation: Array<{
        id: string;
    }>;
    has_more: boolean;
}

export interface RollupProperty {
    id: string;
    type: "rollup";
    rollup: {
        type: "number" | "date" | "array";
        number?: number | null;
        date?: {
            start: string;
            end: string | null;
            time_zone: string | null;
        } | null;
        array?: PropertyValue[];
        function: "count" | "count_values" | "empty" | "not_empty" | "unique" | "show_unique" | "percent_empty" | "percent_not_empty" | "sum" | "average" | "median" | "min" | "max" | "range" | "earliest_date" | "latest_date" | "date_range" | "checked" | "unchecked" | "percent_checked" | "percent_unchecked" | "show_original";
    };
}

export interface RichTextObject {
    type: "text" | "mention" | "equation";
    text?: {
        content: string;
        link: {
            url: string;
        } | null;
    };
    mention?: {
        type: "user" | "page" | "database" | "date" | "link_preview" | "template_mention";
        // ... other mention types
    };
    equation?: {
        expression: string;
    };
    annotations: {
        bold: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
        code: boolean;
        color: "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" | "gray_background" | "brown_background" | "orange_background" | "yellow_background" | "green_background" | "blue_background" | "purple_background" | "pink_background" | "red_background";
    };
    plain_text: string;
    href: string | null;
}

// For databases (less common in query results)
export interface NotionDatabase {
    object: "database";
    id: string;
    created_time: string;
    last_edited_time: string;
    created_by: {
        object: "user";
        id: string;
    };
    last_edited_by: {
        object: "user";
        id: string;
    };
    title: RichTextObject[];
    description: RichTextObject[];
    icon?: {
        type: "emoji" | "external" | "file";
        emoji?: string;
        external?: {
            url: string;
        };
        file?: {
            url: string;
            expiry_time: string;
        };
    };
    cover?: {
        type: "external" | "file";
        external?: {
            url: string;
        };
        file?: {
            url: string;
            expiry_time: string;
        };
    };
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