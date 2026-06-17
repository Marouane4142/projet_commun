import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const dynamic = "force-dynamic";

type SoundReading = {
  id: number;
  measured_at: string;
  db_value: number;
  electronic_card: number | null;
};

const tableName = "g1a_sound";

function getRequestToken(request: NextRequest) {
  const sensorToken = request.headers.get("x-sensor-token");

  if (sensorToken) {
    return sensorToken;
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function validateWriteAccess(request: NextRequest) {
  const expectedToken = process.env.SENSOR_WRITE_TOKEN;

  if (!expectedToken) {
    return null;
  }

  const requestToken = getRequestToken(request);

  if (requestToken !== expectedToken) {
    return toErrorResponse(new Error("Invalid sensor token."), 401);
  }

  return null;
}

function getLimit(request: NextRequest) {
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : 20;

  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function toErrorResponse(error: unknown, status = 500) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const limit = getLimit(request);

    const { data, error } = await supabase
      .from(tableName)
      .select("id, measured_at, db_value, electronic_card")
      .order("measured_at", { ascending: false })
      .limit(limit);

    if (error) {
      return toErrorResponse(error, 500);
    }

    const readings = (data ?? []) as SoundReading[];

    return NextResponse.json(
      {
        latest: readings[0] ?? null,
        readings,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = validateWriteAccess(request);

    if (authError) {
      return authError;
    }

    let body: {
      db_value?: unknown;
      measured_at?: unknown;
      electronic_card?: unknown;
      electronicCard?: unknown;
    };

    try {
      body = (await request.json()) as {
        db_value?: unknown;
        measured_at?: unknown;
        electronic_card?: unknown;
        electronicCard?: unknown;
      };
    } catch {
      return toErrorResponse(new Error("Request body must be valid JSON."), 400);
    }

    const dbValue = Number(body.db_value);

    if (!Number.isFinite(dbValue)) {
      return toErrorResponse(new Error("db_value must be a valid number."), 400);
    }

    const measuredAt =
      typeof body.measured_at === "string" && body.measured_at.length > 0
        ? body.measured_at
        : new Date().toISOString();

    if (Number.isNaN(Date.parse(measuredAt))) {
      return toErrorResponse(new Error("measured_at must be a valid date."), 400);
    }

    let electronicCard: number | null;

    try {
      electronicCard = readElectronicCard(body.electronic_card ?? body.electronicCard);
    } catch (error) {
      return toErrorResponse(error, 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from(tableName)
      .insert({
        db_value: Math.round(dbValue),
        measured_at: measuredAt,
        electronic_card: electronicCard,
      })
      .select("id, measured_at, db_value, electronic_card")
      .single();

    if (error) {
      return toErrorResponse(error, 500);
    }

    return NextResponse.json({ reading: data as SoundReading }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 500);
  }
}

function readElectronicCard(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  const card = Number(value);
  if (!Number.isFinite(card) || card <= 0) {
    throw new Error("electronic_card must be a positive number.");
  }

  return Math.trunc(card);
}
