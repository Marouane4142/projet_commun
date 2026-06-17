import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { alertId?: unknown };
  const alertId = Number(body.alertId);

  if (!Number.isFinite(alertId)) {
    return NextResponse.json({ error: "alertId is required." }, { status: 400 });
  }

  return NextResponse.json({
    resolved: true,
    alertId,
    mode: "mock",
  });
}
