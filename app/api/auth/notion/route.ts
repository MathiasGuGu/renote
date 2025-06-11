import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { notionConfig } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Implement Notion OAuth initiation
    const authUrl = `${notionConfig.authUrl}?client_id=${notionConfig.clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(notionConfig.redirectUri!)}&state=${userId}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Notion OAuth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
