import { NextResponse } from "next/server";
import { thresholds } from "@/lib/mockData";
import { requireGerant } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ thresholds });
}

export async function POST() {
  const guard = await requireGerant();
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    saved: true,
    message: "Seuils enregistrés pour la session.",
  });
}
