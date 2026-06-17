import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncMatch } from "@/lib/footballApiService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId");
  const match = await syncMatch(matchId);
  return NextResponse.json({ match, synced: true });
}
