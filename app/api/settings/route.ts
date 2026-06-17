import { NextResponse } from "next/server";
import { thresholds } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ thresholds, mode: "mock" });
}

export async function POST() {
  return NextResponse.json({
    saved: true,
    mode: "mock",
    message: "Settings API is ready; persistence will use Prisma once the tables exist.",
  });
}
