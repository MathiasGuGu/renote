import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  exchangeNotionCode,
  createNotionAccount,
} from "@/lib/actions/notion-actions";
import { ensureUserExists } from "@/lib/actions/user-actions";

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
      const oauthResponse = await exchangeNotionCode(code);

      // Ensure user exists in our database
      await ensureUserExists({
        email: "", // This will be filled from Clerk data
        firstName: "",
        lastName: "",
        imageUrl: "",
      });

      // Create Notion account in database
      const account = await createNotionAccount(oauthResponse);

      console.log("Successfully created Notion account:", account.id);

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
