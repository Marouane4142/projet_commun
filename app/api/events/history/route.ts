import { NextResponse } from "next/server";
import { getFinishedEventHistory } from "@/lib/historyService";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getFinishedEventHistory();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
