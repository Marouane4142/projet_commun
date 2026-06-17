import { NextRequest, NextResponse } from "next/server";
import { listTeamMatches } from "@/lib/footballApiService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get("teamId");
  const teamName = request.nextUrl.searchParams.get("teamName");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);

  const payload = await listTeamMatches({
    teamId,
    teamName,
    limit: Number.isFinite(limit) ? limit : 20,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
