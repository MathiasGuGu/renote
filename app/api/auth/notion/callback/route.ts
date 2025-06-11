import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createNotionAccount } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Notion OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=oauth_denied", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_request", request.url)
      );
    }

    const { userId } = await auth();

    if (!userId || userId !== state) {
      return NextResponse.redirect(
        new URL("/settings?error=unauthorized", request.url)
      );
    }

    try {
      // TODO: Implement actual account creation
      await createNotionAccount(userId, code);
      return NextResponse.redirect(
        new URL("/settings?success=notion_connected", request.url)
      );
    } catch (error) {
      console.error("Error creating Notion account:", error);
      return NextResponse.redirect(
        new URL("/settings?error=connection_failed", request.url)
      );
    }
  } catch (error) {
    console.error("Error in Notion OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/settings?error=internal_error", request.url)
    );
  }
}
