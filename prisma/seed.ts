import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sensorDefinitions = [
  { type: "TEMPERATURE", label: "Temperature", unit: "C" },
  { type: "DECIBEL", label: "Decibels", unit: "dB" },
  { type: "SMOKE", label: "Fumee", unit: "%" },
  { type: "GAS", label: "Gaz", unit: "ppm" },
  { type: "PEOPLE_COUNT", label: "Personnes", unit: "pers." },
] as const;

async function main() {
  await prisma.alert.deleteMany();
  await prisma.matchEvent.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.threshold.deleteMany();
  await prisma.match.deleteMany();
  await prisma.barZone.deleteMany();

  const zoneA = await prisma.barZone.create({
    data: {
      name: "Zone A",
      supporterTeam: "France",
      color: "#2563eb",
      maxCapacity: 80,
    },
  });

  const zoneB = await prisma.barZone.create({
    data: {
      name: "Zone B",
      supporterTeam: "Bresil",
      color: "#facc15",
      maxCapacity: 80,
    },
  });

  const sensors = [];

  for (const zone of [zoneA, zoneB]) {
    for (const definition of sensorDefinitions) {
      sensors.push(
        await prisma.sensor.create({
          data: {
            name: `${definition.label} - ${zone.name}`,
            type: definition.type,
            unit: definition.unit,
            zoneId: zone.id,
          },
        }),
      );
    }
  }

  await prisma.threshold.createMany({
    data: [
      { metricType: "DECIBEL", warningValue: 75, alertValue: 90, criticalValue: 100, unit: "dB" },
      { metricType: "TEMPERATURE", warningValue: 26, alertValue: 29, criticalValue: 32, unit: "C" },
      { metricType: "SMOKE", warningValue: 10, alertValue: 25, criticalValue: 45, unit: "%" },
      { metricType: "GAS", warningValue: 350, alertValue: 650, criticalValue: 900, unit: "ppm" },
      { metricType: "PEOPLE_COUNT", warningValue: 65, alertValue: 80, criticalValue: 90, unit: "pers." },
    ],
  });

  const match = await prisma.match.create({
    data: {
      externalId: "mock-france-brazil",
      competition: "Coupe du Monde",
      homeTeam: "France",
      awayTeam: "Bresil",
      homeScore: 2,
      awayScore: 1,
      status: "LIVE",
      minute: 68,
      kickoffAt: new Date(Date.now() - 68 * 60 * 1000),
      lastSyncedAt: new Date(),
    },
  });

  await prisma.matchEvent.createMany({
    data: [
      { matchId: match.id, minute: 18, type: "GOAL", team: "France", player: "Mbappe", description: "Ouverture du score de la France." },
      { matchId: match.id, minute: 42, type: "GOAL", team: "Bresil", player: "Vinicius Jr", description: "Egalisation du Bresil." },
      { matchId: match.id, minute: 64, type: "GOAL", team: "France", player: "Griezmann", description: "La France reprend l'avantage." },
    ],
  });

  const now = Date.now();

  for (const sensor of sensors) {
    for (let i = 10; i >= 0; i -= 1) {
      const base =
        sensor.type === "DECIBEL"
          ? sensor.zoneId === zoneA.id
            ? 76
            : 70
          : sensor.type === "TEMPERATURE"
            ? 24
            : sensor.type === "PEOPLE_COUNT"
              ? sensor.zoneId === zoneA.id
                ? 58
                : 49
              : sensor.type === "GAS"
                ? 220
                : 4;

      await prisma.sensorReading.create({
        data: {
          sensorId: sensor.id,
          zoneId: sensor.zoneId,
          type: sensor.type,
          value: base + Math.round(Math.random() * 10),
          unit: sensor.unit,
          status: "OK",
          measuredAt: new Date(now - i * 5 * 60 * 1000),
        },
      });
    }
  }

  await prisma.alert.createMany({
    data: [
      {
        zoneId: zoneA.id,
        type: "DECIBEL",
        severity: "WARNING",
        message: "Ambiance tres forte en Zone A.",
        isResolved: false,
        triggeredAt: new Date(now - 12 * 60 * 1000),
      },
      {
        zoneId: zoneB.id,
        type: "TEMPERATURE",
        severity: "WARNING",
        message: "Temperature en hausse en Zone B.",
        isResolved: false,
        triggeredAt: new Date(now - 7 * 60 * 1000),
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
