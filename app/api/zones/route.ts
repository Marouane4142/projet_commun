import { NextResponse } from "next/server";
import { zones } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ zones });
}
