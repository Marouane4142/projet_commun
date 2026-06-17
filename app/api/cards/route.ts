import { NextResponse } from "next/server";
import { getBridgeStatus } from "@/lib/cardBridgeService";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getBridgeStatus();

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
