# Notion Integration Implementation Guide

## 📋 Overview

This document explains the complete implementation of the Notion integration for the Renote application. The integration allows users to connect their Notion workspaces, sync databases and pages, and manage their content within the app.

## 🏗️ Architecture

### **System Design**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App  │◄──►│   Drizzle ORM    │◄──►│   PostgreSQL    │
│                 │    │                  │    │   (Supabase)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│  Notion API     │◄──►│   OAuth 2.0      │
│                 │    │   Flow           │
└─────────────────┘    └──────────────────┘
```

### **Key Components**

- **Server Actions** (`app/server.ts`) - All database operations
- **Notion Client** (`lib/notion/client.ts`) - API interactions
- **Database Schemas** (`lib/db/schema/`) - Data models
- **OAuth Flow** (`app/api/auth/notion/`) - Authentication
- **UI Components** (`components/integrations/`) - User interface

## 🗂️ Database Schema

### **Users Table**

```sql
users {
  id: UUID (Primary Key)
  clerkId: TEXT (Unique, Foreign Key to Clerk)
  email: TEXT
  firstName: TEXT
  lastName: TEXT
  imageUrl: TEXT
  preferences: JSONB {
    theme?: "light" | "dark"
    notifications?: boolean
    language?: string
  }
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

### **Notion Accounts Table**

```sql
notion_accounts {
  id: UUID (Primary Key)
  userId: UUID (Foreign Key → users.id)
  workspaceName: TEXT
  workspaceId: TEXT
  workspaceIcon: TEXT
  accessToken: TEXT (Encrypted in production)
  botId: TEXT
  owner: JSONB (Notion user/workspace info)
  duplicatedTemplateId: TEXT
  requestId: TEXT
  status: ENUM ("connected", "disconnected", "error")
  lastSync: TIMESTAMP
  syncError: TEXT
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

### **Notion Databases Table**

```sql
notion_databases {
  id: UUID (Primary Key)
  accountId: UUID (Foreign Key → notion_accounts.id)
  notionId: TEXT (Unique, Notion's database ID)
  title: TEXT
  description: TEXT
  url: TEXT
  cover: JSONB (Cover image data)
  icon: JSONB (Icon data)
  properties: JSONB (Database schema)
  parent: JSONB (Parent page/workspace info)
  archived: TEXT
  inTrash: TEXT
  isInline: TEXT
  publicUrl: TEXT
  pageCount: INTEGER
  lastEditedTime: TIMESTAMP
  createdTime: TIMESTAMP
  lastSyncedAt: TIMESTAMP
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

### **Notion Pages Table**

```sql
notion_pages {
  id: UUID (Primary Key)
  accountId: UUID (Foreign Key → notion_accounts.id)
  notionId: TEXT (Unique, Notion's page ID)
  title: TEXT
  url: TEXT
  cover: JSONB
  icon: JSONB
  parent: JSONB
  properties: JSONB
  content: JSONB (Page blocks/content)
  archived: TEXT
  inTrash: TEXT
  publicUrl: TEXT
  lastEditedTime: TIMESTAMP
  createdTime: TIMESTAMP
  lastSyncedAt: TIMESTAMP
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

## 🔐 Authentication Flow

### **OAuth 2.0 Implementation**

1. **Initiation** (`/api/auth/notion`)

   ```typescript
   // User clicks "Connect Notion Account"
   // → Redirects to /api/auth/notion
   // → Builds OAuth URL with client_id, redirect_uri, state
   // → Redirects to Notion's authorization page
   ```

2. **User Authorization**

   ```
   User grants permissions on Notion → Notion redirects back with code
   ```

3. **Token Exchange** (`/api/auth/notion/callback`)
   ```typescript
   // Receives authorization code
   // → Exchanges code for access token via Notion API
   // → Creates user account in database
   // → Stores encrypted access token
   // → Redirects to settings with success message
   ```

### **Environment Variables Required**

```bash
# Notion OAuth
NOTION_CLIENT_ID=your_notion_integration_client_id
NOTION_CLIENT_SECRET=your_notion_integration_secret
NOTION_REDIRECT_URI=https://yourapp.com/api/auth/notion/callback

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Clerk (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## 🔧 Server Actions Implementation

### **Core Functions** (`app/server.ts`)

#### **User Management**

```typescript
getCurrentUser(); // Get current authenticated user
ensureUserExists(userData); // Create user if doesn't exist
updateUserPreferences(prefs); // Update user settings
```

#### **Notion Account Management**

```typescript
createNotionAccount(oauthData); // Create new Notion connection
getUserNotionAccounts(); // Get user's connected accounts
removeNotionAccount(accountId); // Disconnect account
updateNotionAccountStatus(id, status); // Update connection status
```

#### **Synchronization**

```typescript
syncNotionAccount(accountId); // Sync single account
syncAllNotionAccounts(); // Sync all user accounts
recordNotionSync(id, success); // Record sync results
```

#### **OAuth Helpers**

```typescript
exchangeNotionCode(code); // Exchange auth code for token
getNotionIntegrationStats(id); // Get sync statistics
```

## 🔌 Notion API Client

### **Client Class** (`lib/notion/client.ts`)

```typescript
class NotionClient {
  constructor(accessToken: string);

  // Core Methods
  async getUser(); // Get workspace info
  async getDatabases(); // List databases
  async getPages(); // List pages
  async search(query); // Search content

  // Detailed Methods
  async getDatabase(id); // Get specific database
  async getPage(id); // Get specific page
  async getPageContent(id); // Get page blocks
  async queryDatabase(id, options); // Query database with filters
}
```

### **Rate Limiting**

```typescript
class NotionRateLimiter {
  // Respects Notion's 3 requests/second limit
  async throttle();
}
```

### **Utility Functions**

```typescript
formatNotionDate(dateString); // Format Notion dates
extractNotionIcon(icon); // Extract icon URLs/emojis
extractNotionCover(cover); // Extract cover image URLs
```

## 🎨 UI Components

### **Settings Page** (`app/settings/page.tsx`)

- **Displays** integration status and connected accounts
- **Handles** OAuth success/error messages
- **Shows** comprehensive error messages for different failure scenarios
- **Provides** integration statistics and sync status

### **NotionIntegration Component** (`components/integrations/notion-integration.tsx`)

- **Connect/Disconnect** Notion accounts with visual feedback
- **Real-time sync** with loading states
- **Account management** with workspace icons and status badges
- **Statistics display** showing databases, pages, and last sync
- **Error handling** with user-friendly messages

## 🚀 Usage Instructions

### **For Developers**

1. **Environment Setup**

   ```bash
   # Install dependencies
   pnpm add drizzle-orm postgres
   pnpm add -D drizzle-kit

   # Set environment variables
   cp .env.example .env.local
   # Fill in your actual values
   ```

2. **Database Setup**

   ```bash
   # Generate migrations
   pnpm db:generate

   # Push schema to database
   pnpm db:push

   # Open database GUI
   pnpm db:studio
   ```

3. **Notion Integration Setup**
   - Create integration at [notion.so/my-integrations](https://notion.so/my-integrations)
   - Set redirect URL: `http://localhost:3000/api/auth/notion/callback`
   - Copy Client ID and Secret to `.env.local`

### **For Users**

1. **Connect Account**

   - Go to Settings page
   - Click "Connect Notion Account"
   - Authorize in Notion
   - Account appears in connected accounts list

2. **Manage Accounts**
   - View connection status
   - Manually trigger sync
   - Disconnect unwanted accounts
   - Monitor sync statistics

## 🔄 Data Flow

### **Connection Process**

```
User → Settings → Connect Button → OAuth → Notion → Callback → Database → Settings (Updated)
```

### **Sync Process**

```
User → Sync Button → Server Action → Notion API → Database → UI Update
```

### **Data Retrieval**

```
Settings Page → Server Function → Database Query → Component Render
```

## 🛡️ Security Considerations

### **Implemented Security**

- **Access Tokens** stored securely (consider encryption for production)
- **OAuth State** parameter prevents CSRF attacks
- **User Authorization** verified on every request
- **Server Actions** ensure database operations are server-side only
- **Rate Limiting** respects Notion API limits

### **Production Recommendations**

- **Encrypt access tokens** in database
- **Implement token refresh** for long-lived connections
- **Add request logging** for audit trails
- **Set up monitoring** for failed sync attempts
- **Implement retry logic** for transient failures

## 📊 Monitoring & Analytics

### **Sync Statistics**

- Track successful/failed syncs
- Monitor database/page counts
- Record sync frequencies
- Alert on repeated failures

### **User Metrics**

- Connection success rates
- Most used features
- Error frequency analysis
- Performance monitoring

## 🔮 Future Enhancements

### **Planned Features**

- **Background sync jobs** with cron scheduling
- **Webhook support** for real-time updates
- **Content search** across synced data
- **Export functionality** to other formats
- **Advanced filtering** and querying
- **Collaboration features** with shared workspaces

### **Technical Improvements**

- **Connection pooling** for better database performance
- **Caching layer** for frequently accessed data
- **Incremental sync** to reduce API calls
- **Bulk operations** for large datasets
- **Advanced error recovery** with exponential backoff

## 🐛 Troubleshooting

### **Common Issues**

1. **OAuth Failures**

   - Check redirect URI matches exactly
   - Verify Client ID/Secret are correct
   - Ensure Notion integration is public

2. **Database Connection Issues**

   - Verify DATABASE_URL is correct
   - Check database permissions
   - Ensure schema is up to date

3. **Sync Failures**
   - Check access token validity
   - Verify workspace permissions
   - Monitor rate limiting

### **Debug Commands**

```bash
# Check database connection
pnpm db:studio

# View logs
npm run dev

# Test API endpoints
curl -X GET http://localhost:3000/api/auth/notion
```

## 📈 Performance Optimization

### **Database Optimizations**

- **Indexed columns** for faster queries
- **Connection pooling** for concurrent requests
- **Query optimization** with proper JOINs
- **Pagination** for large datasets

### **API Optimizations**

- **Request batching** where possible
- **Conditional requests** using ETags
- **Partial sync** for updated content only
- **Parallel processing** for multiple accounts

---

This implementation provides a robust, scalable foundation for Notion integration with proper security, error handling, and user experience considerations.
