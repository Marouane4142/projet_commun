import { NextRequest, NextResponse } from "next/server";
import {
  assertCardsAvailable,
  parseElectronicCardId,
  startBridgeEvent,
} from "@/lib/cardBridgeService";
import { createEvent, listEvents, updateEventStatus } from "@/lib/eventService";
import { requireGerant } from "@/lib/authGuard";
import type { FanEventStatus, MatchOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: FanEventStatus[] = ["planned", "active", "finished", "archived"];

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const payload = await listEvents({
    status: statuses.includes(status as FanEventStatus) ? (status as FanEventStatus) : null,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireGerant();
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as {
    name?: unknown;
    match?: Partial<MatchOption>;
    zoneATeam?: unknown;
    zoneBTeam?: unknown;
    zoneACard?: unknown;
    zoneBCard?: unknown;
    skipBridgeStart?: unknown;
  };

  if (!isValidMatch(body.match)) {
    return NextResponse.json({ error: "match is required." }, { status: 400 });
  }

  const name = readRequiredString(body.name, "name");
  const zoneATeam = readRequiredString(body.zoneATeam, "zoneATeam");
  const zoneBTeam = readRequiredString(body.zoneBTeam, "zoneBTeam");
  const zoneACard = readRequiredString(body.zoneACard, "zoneACard");
  const zoneBCard = readRequiredString(body.zoneBCard, "zoneBCard");

  const invalid = [name, zoneATeam, zoneBTeam, zoneACard, zoneBCard].find(
    (value) => value.error,
  );

  if (invalid?.error) {
    return NextResponse.json({ error: invalid.error }, { status: 400 });
  }

  const zoneACardId = parseElectronicCardId(zoneACard.value);
  const zoneBCardId = parseElectronicCardId(zoneBCard.value);

  if (!zoneACardId || !zoneBCardId) {
    return NextResponse.json(
      { error: "Les cartes doivent contenir un id numerique." },
      { status: 400 },
    );
  }

  if (zoneACardId === zoneBCardId) {
    return NextResponse.json(
      { error: "Chaque zone doit utiliser une carte differente." },
      { status: 400 },
    );
  }

  const skipBridgeStart = body.skipBridgeStart === true;

  if (!skipBridgeStart) {
    try {
      await assertCardsAvailable([zoneACardId, zoneBCardId]);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Cartes indisponibles." },
        { status: 409 },
      );
    }
  }

  try {
    const event = await createEvent({
      name: name.value,
      match: body.match,
      zoneATeam: zoneATeam.value,
      zoneBTeam: zoneBTeam.value,
      zoneACard: zoneACard.value,
      zoneBCard: zoneBCard.value,
      status: "active",
    });

    if (!skipBridgeStart) {
      try {
        await startBridgeEvent(event.id, [zoneACardId, zoneBCardId]);
      } catch (bridgeError) {
        await updateEventStatus({
          id: String(event.id),
          status: "archived",
        });

        return NextResponse.json(
          {
            error:
              bridgeError instanceof Error
                ? bridgeError.message
                : "Une carte ne repond pas a la passerelle.",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create event." },
      { status: 500 },
    );
  }
}

function readRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { value: "", error: `${label} is required.` };
  }

  return { value: value.trim(), error: null };
}

function isValidMatch(match: unknown): match is MatchOption {
  if (!match || typeof match !== "object") return false;
  const candidate = match as Partial<MatchOption>;
  return Boolean(
    candidate.id &&
      candidate.homeTeam &&
      candidate.awayTeam &&
      candidate.kickoffAt &&
      candidate.label,
  );
}
