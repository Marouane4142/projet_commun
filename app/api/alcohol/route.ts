import { NextResponse } from "next/server";
import { getAlcoholReport } from "@/lib/alcoholService";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getAlcoholReport();
  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
