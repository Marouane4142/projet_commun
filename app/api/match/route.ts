import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentMatch } from "@/lib/footballApiService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId");
  const match = await getCurrentMatch(matchId);
  return NextResponse.json({ match });
}
