import { eventToZones, listEvents } from "./eventService";
import { getAllReadings, mapReadingsToEventZones } from "./fanbarService";
import type { EventHistoryItem, MetricType, SensorReading } from "./types";

const metricTypes: MetricType[] = ["decibel", "temperature", "smoke", "gas", "people_count"];

export async function getFinishedEventHistory() {
  const [{ events, message }, readings] = await Promise.all([
    listEvents({ status: "finished" }),
    getAllReadings(1000),
  ]);

  const items: EventHistoryItem[] = events.map((event) => {
    const mappedReadings = mapReadingsToEventZones(readings, eventToZones(event));
    const eventReadings = mappedReadings.filter((reading) =>
      isReadingInsideEvent(reading, event.createdAt, event.finishedAt ?? event.updatedAt),
    );

    return {
      event,
      score: {
        home: event.finalHomeScore,
        away: event.finalAwayScore,
      },
      averages: metricTypes.map((type) => ({
        type,
        zoneA: averageMetric(eventReadings, type, 1),
        zoneB: averageMetric(eventReadings, type, 2),
        unit: getMetricUnit(type),
      })),
    };
  });

  return {
    items,
    message,
  };
}

function isReadingInsideEvent(reading: SensorReading, startValue: string, endValue: string) {
  const measuredAt = new Date(reading.measuredAt).getTime();
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (!Number.isFinite(measuredAt) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  return measuredAt >= start && measuredAt <= end;
}

function averageMetric(readings: SensorReading[], type: MetricType, zoneId: number) {
  const values = readings
    .filter((reading) => reading.type === type && reading.zoneId === zoneId)
    .map((reading) => reading.value);

  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function getMetricUnit(type: MetricType) {
  if (type === "decibel") return "dB";
  if (type === "temperature") return "C";
  if (type === "smoke") return "%";
  if (type === "gas") return "ppm";
  return "pers.";
}
