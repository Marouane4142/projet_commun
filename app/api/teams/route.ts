import { NextRequest, NextResponse } from "next/server";
import { searchTeams } from "@/lib/footballApiService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 24);

  const payload = await searchTeams({
    search,
    limit: Number.isFinite(limit) ? limit : 24,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
