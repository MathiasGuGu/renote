import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createNotionAccount, exchangeNotionCode } from "@/lib/actions/notion";
import { NotionOauthResponse } from "@/lib/integrations/notion/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Notion OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=oauth_denied", request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_request", request.url)
      );
    }

    // Verify user authentication
    const { userId: clerkId } = await auth();
    if (!clerkId || clerkId !== state) {
      return NextResponse.redirect(
        new URL("/settings?error=unauthorized", request.url)
      );
    }

    try {
      // Exchange authorization code for access token
      const oauthData: NotionOauthResponse = await exchangeNotionCode(code);

      // Create Notion account in database with OAuth response data
      await createNotionAccount(oauthData);

      // Optional: Trigger initial sync job
      // await addJob(QUEUE_NAMES.SYNC_PIPELINE, {
      //   userId: notionAccount.userId,
      //   accountId: notionAccount.id,
      //   type: "sync-notion",
      //   metadata: {
      //     isInitialSync: true,
      //     triggeredBy: "oauth_callback"
      //   }
      // });

      return NextResponse.redirect(
        new URL("/settings?success=notion_connected", request.url)
      );
    } catch (error) {
      console.error("Error creating Notion account:", error);

      // Provide more specific error messages
      const errorMessage =
        error instanceof Error ? error.message : "connection_failed";
      const errorCode = errorMessage.includes("token")
        ? "invalid_token"
        : errorMessage.includes("workspace")
          ? "workspace_error"
          : "connection_failed";

      return NextResponse.redirect(
        new URL(`/settings?error=${errorCode}`, request.url)
      );
    }
  } catch (error) {
    console.error("Error in Notion OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/settings?error=internal_error", request.url)
    );
  }
}
