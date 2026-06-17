import { createClient } from "@/utils/supabase/server";

export type UserRole = "client" | "gerant";

export type FanProfile = {
  id: string;
  pseudo: string;
  role: UserRole;
  favoriteTeam: string | null;
  createdAt: string;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: FanProfile | null;
};

/**
 * Renvoie l'utilisateur authentifie + son profil applicatif (table g1a_profiles).
 * S'appuie sur supabase.auth.getUser() qui revalide le jeton cote serveur.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("g1a_profiles")
      .select("id, pseudo, role, favorite_team, created_at")
      .eq("id", user.id)
      .maybeSingle();

    const profile: FanProfile | null = data
      ? {
          id: data.id as string,
          pseudo: (data.pseudo as string) ?? "Supporter",
          role: (data.role as UserRole) ?? "client",
          favoriteTeam: (data.favorite_team as string | null) ?? null,
          createdAt: data.created_at as string,
        }
      : null;

    return {
      id: user.id,
      email: user.email ?? null,
      profile,
    };
  } catch {
    return null;
  }
}

export function isGerant(user: CurrentUser | null): boolean {
  return user?.profile?.role === "gerant";
}
