import { NextRequest, NextResponse } from "next/server";
import { createReading, getAllReadings } from "@/lib/fanbarService";
import type { MetricType } from "@/lib/types";

export const dynamic = "force-dynamic";

const validTypes: MetricType[] = [
  "temperature",
  "decibel",
  "smoke",
  "gas",
  "people_count",
];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as MetricType | null;
  const zoneId = Number(request.nextUrl.searchParams.get("zoneId") ?? 0);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
  const requestedLimit = Number.isFinite(limit) ? Math.max(Math.trunc(limit), 1) : 100;
  const readings = await getAllReadings(Math.max(requestedLimit * 20, 240));

  return NextResponse.json({
    readings: readings.filter((reading) => {
      if (type && reading.type !== type) return false;
      if (zoneId && reading.zoneId !== zoneId) return false;
      return true;
    }).slice(0, requestedLimit),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    sensorId?: unknown;
    zoneId?: unknown;
    type?: unknown;
    value?: unknown;
    unit?: unknown;
    measuredAt?: unknown;
    electronicCard?: unknown;
    electronic_card?: unknown;
  };

  const type = String(body.type ?? "") as MetricType;
  const value = Number(body.value);
  const sensorId = Number(body.sensorId);
  const zoneId = Number(body.zoneId);
  const electronicCard = normalizeElectronicCard(body.electronicCard ?? body.electronic_card);

  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "type is invalid." }, { status: 400 });
  }

  if (!Number.isFinite(value) || !Number.isFinite(sensorId) || !Number.isFinite(zoneId)) {
    return NextResponse.json(
      { error: "sensorId, zoneId and value must be valid numbers." },
      { status: 400 },
    );
  }

  const measuredAt =
    typeof body.measuredAt === "string" && body.measuredAt.length > 0
      ? body.measuredAt
      : undefined;

  if (measuredAt && Number.isNaN(Date.parse(measuredAt))) {
    return NextResponse.json(
      { error: "measuredAt must be a valid ISO date." },
      { status: 400 },
    );
  }

  try {
    const reading = await createReading({
      sensorId,
      zoneId,
      type,
      value,
      unit: typeof body.unit === "string" ? body.unit : undefined,
      measuredAt,
      electronicCard,
    });

    return NextResponse.json({ reading }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reading.";

    return NextResponse.json(
      { error: message },
      { status: message.includes("n'est pas encore connectee") ? 503 : 500 },
    );
  }
}

function normalizeElectronicCard(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  const card = Number(value);
  return Number.isFinite(card) && card > 0 ? Math.trunc(card) : undefined;
}
