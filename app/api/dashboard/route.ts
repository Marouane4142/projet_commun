import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDashboardData } from "@/lib/fanbarService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  const matchId = request.nextUrl.searchParams.get("matchId");
  const data = await getDashboardData({ eventId, matchId });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
