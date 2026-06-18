import { NextRequest, NextResponse } from "next/server";
import { stopBridgeEvent } from "@/lib/cardBridgeService";
import { getEventById, updateEventStatus } from "@/lib/eventService";
import { requireGerant } from "@/lib/authGuard";
import type { FanEventStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const event = await getEventById(id);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ event }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireGerant();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: unknown;
    finalHomeScore?: unknown;
    finalAwayScore?: unknown;
    skipBridgeStop?: unknown;
  };
  const status = String(body.status ?? "") as FanEventStatus;

  if (!["planned", "active", "finished", "archived"].includes(status)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  try {
    const event = await updateEventStatus({
      id,
      status,
      finalHomeScore: normalizeScore(body.finalHomeScore),
      finalAwayScore: normalizeScore(body.finalAwayScore),
    });

    let bridgeWarning: string | null = null;

    const skipBridgeStop = body.skipBridgeStop === true;

    if (
      !skipBridgeStop &&
      (status === "finished" || status === "archived" || status === "planned")
    ) {
      try {
        await stopBridgeEvent(event.id);
      } catch (error) {
        bridgeWarning =
          error instanceof Error ? error.message : "Passerelle locale non arretee.";
      }
    }

    return NextResponse.json({ event, bridgeWarning });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update event." },
      { status: 500 },
    );
  }
}

function normalizeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.trunc(score) : null;
}
