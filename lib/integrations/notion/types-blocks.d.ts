export type BlockType = 
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "toggle"
  | "code"
  | "child_page"
  | "child_database"
  | "embed"
  | "image"
  | "video"
  | "file"
  | "pdf"
  | "bookmark"
  | "callout"
  | "quote"
  | "equation"
  | "divider"
  | "table_of_contents"
  | "column_list"
  | "column"
  | "link_to_page"
  | "synced_block"
  | "template"
  | "link_preview"
  | "table"
  | "table_row";

export interface BaseBlock {
  object: "block";
  id: string;
  type: BlockType;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  archived: boolean;
}

export interface TextContentBlock extends BaseBlock {
  type: Exclude<BlockType, "child_page" | "child_database" | "column_list" | "column" | "table" | "table_row">;
  paragraph?: {
    rich_text: RichText[];
    color?: string;
  };
  heading_1?: {
    rich_text: RichText[];
    color?: string;
  };
  heading_2?: {
    rich_text: RichText[];
    color?: string;
  };
  heading_3?: {
    rich_text: RichText[];
    color?: string;
  };
  bulleted_list_item?: {
    rich_text: RichText[];
    color?: string;
  };
  numbered_list_item?: {
    rich_text: RichText[];
    color?: string;
  };
  to_do?: {
    rich_text: RichText[];
    checked: boolean;
    color?: string;
  };
  toggle?: {
    rich_text: RichText[];
    color?: string;
  };
  code?: {
    rich_text: RichText[];
    language: string;
    caption?: RichText[];
  };
  embed?: {
    url: string;
    caption?: RichText[];
  };
  image?: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: RichText[];
  };
  video?: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: RichText[];
  };
  file?: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: RichText[];
  };
  pdf?: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: RichText[];
  };
  bookmark?: {
    url: string;
    caption?: RichText[];
  };
  callout?: {
    rich_text: RichText[];
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
    color?: string;
  };
  quote?: {
    rich_text: RichText[];
    color?: string;
  };
  equation?: {
    expression: string;
  };
  divider?: Record<string, never>;
  table_of_contents?: {
    color?: string;
  };
  link_to_page?: {
    type: "page_id" | "database_id";
    page_id?: string;
    database_id?: string;
  };
  synced_block?: {
    synced_from: null | {
      type: "block_id";
      block_id: string;
    };
  };
  template?: {
    rich_text: RichText[];
  };
  link_preview?: {
    url: string;
  };
}

export interface ChildPageBlock extends BaseBlock {
  type: "child_page";
  child_page: {
    title: string;
  };
}

export interface ChildDatabaseBlock extends BaseBlock {
  type: "child_database";
  child_database: {
    title: string;
  };
}

export interface ColumnListBlock extends BaseBlock {
  type: "column_list";
  column_list: Record<string, never>;
}

export interface ColumnBlock extends BaseBlock {
  type: "column";
  column: Record<string, never>;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  table: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
  };
}

export interface TableRowBlock extends BaseBlock {
  type: "table_row";
  table_row: {
    cells: RichText[][];
  };
}

export type NotionBlock = 
  | TextContentBlock
  | ChildPageBlock
  | ChildDatabaseBlock
  | ColumnListBlock
  | ColumnBlock
  | TableBlock
  | TableRowBlock;