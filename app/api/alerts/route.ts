import { NextResponse } from "next/server";
import { getActiveAlerts } from "@/lib/fanbarService";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getActiveAlerts();
  return NextResponse.json({ alerts });
}
