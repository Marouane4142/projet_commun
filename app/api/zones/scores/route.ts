import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/fanbarService";

export const dynamic = "force-dynamic";

export async function GET() {
  const dashboard = await getDashboardData();
  return NextResponse.json({ zones: dashboard.zones, winner: dashboard.winner });
}
