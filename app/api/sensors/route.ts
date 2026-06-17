import { NextRequest, NextResponse } from "next/server";
import { getSensorsWithLatest } from "@/lib/fanbarService";
import type { MetricType, Sensor } from "@/lib/types";

export const dynamic = "force-dynamic";

const validTypes: MetricType[] = [
  "temperature",
  "decibel",
  "smoke",
  "gas",
  "people_count",
];

export async function GET() {
  const sensors = await getSensorsWithLatest();
  return NextResponse.json({ sensors });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<Sensor>;

  if (!body.name || !body.type || !validTypes.includes(body.type)) {
    return NextResponse.json(
      { error: "name and a valid type are required." },
      { status: 400 },
    );
  }

  const sensor: Sensor = {
    id: Date.now(),
    name: body.name,
    type: body.type,
    unit: body.unit ?? defaultUnit(body.type),
    zoneId: Number(body.zoneId ?? 1),
    isActive: body.isActive ?? true,
  };

  return NextResponse.json(
    {
      sensor,
      mode: "mock",
      message: "Sensor tables are prepared in Prisma but not connected yet.",
    },
    { status: 201 },
  );
}

function defaultUnit(type: MetricType) {
  if (type === "temperature") return "C";
  if (type === "decibel") return "dB";
  if (type === "gas") return "ppm";
  if (type === "people_count") return "pers.";
  return "%";
}
