import { anonSensorClient } from "./sensorClients";
import { getReadingStatus } from "./scores";
import type { SensorReading } from "./types";

type SupabaseSoundReading = {
  id: number;
  measured_at: string;
  db_value: number;
  electronic_card: number | null;
};

const tableName = "g1a_sound";

export async function getSupabaseSoundReadings(limit = 50): Promise<SensorReading[]> {
  try {
    const supabase = anonSensorClient();
    const { data, error } = await supabase
      .from(tableName)
      .select("id, measured_at, db_value, electronic_card")
      .order("measured_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Supabase sound read failed:", error.message);
      return [];
    }

    return ((data ?? []) as SupabaseSoundReading[]).map((reading) => ({
      id: reading.id,
      sensorId: 2,
      zoneId: getDefaultZoneId(reading.electronic_card),
      electronicCard: reading.electronic_card,
      type: "decibel",
      value: reading.db_value,
      unit: "dB",
      status: getReadingStatus("decibel", reading.db_value),
      measuredAt: reading.measured_at,
      createdAt: reading.measured_at,
      source: "supabase",
    }));
  } catch (error) {
    console.warn("Supabase sound read failed:", error);
    return [];
  }
}

export async function createSupabaseSoundReading(input: {
  value: number;
  measuredAt?: string;
  electronicCard?: number | null;
}) {
  const supabase = anonSensorClient();
  const measuredAt = input.measuredAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .from(tableName)
    .insert({
      db_value: Math.round(input.value),
      measured_at: measuredAt,
      electronic_card: input.electronicCard ?? null,
    })
    .select("id, measured_at, db_value, electronic_card")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const reading = data as SupabaseSoundReading;

  return {
    id: reading.id,
    sensorId: 2,
    zoneId: getDefaultZoneId(reading.electronic_card),
    electronicCard: reading.electronic_card,
    type: "decibel",
    value: reading.db_value,
    unit: "dB",
    status: getReadingStatus("decibel", reading.db_value),
    measuredAt: reading.measured_at,
    createdAt: reading.measured_at,
    source: "supabase",
  } satisfies SensorReading;
}

function getDefaultZoneId(electronicCard: number | null) {
  if (electronicCard === 1 || electronicCard === 2) {
    return electronicCard;
  }

  return 1;
}
