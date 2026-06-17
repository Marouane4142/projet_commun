import { NextResponse } from "next/server";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getEcosystemSnapshot();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
