import { NextResponse } from "next/server";
import { getCurrentUser, isGerant, type CurrentUser } from "./profileService";

/**
 * Garde serveur : vérifie que l'appelant est connecté ET gérant.
 * Renvoie l'utilisateur si OK, sinon une réponse 401/403 prête à retourner.
 */
export async function requireGerant(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Connexion requise." },
        { status: 401 },
      ),
    };
  }

  if (!isGerant(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Action réservée au gérant du bar." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
