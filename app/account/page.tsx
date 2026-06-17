import { CalendarDays, Mail, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountClient } from "@/components/AccountClient";
import { getCurrentUser } from "@/lib/profileService";

export const metadata = { title: "Mon compte - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = user.profile;
  const pseudo = profile?.pseudo ?? "Supporter";
  const role = profile?.role ?? "client";
  const created = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/[0.04] to-blue-500/10 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400 text-2xl font-black text-slate-950">
            {pseudo.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-black">{pseudo}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
              <span className="flex items-center gap-1.5">
                <UserRound size={14} />
                {role === "gerant" ? "Gerant du bar" : "Supporter"}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={14} />
                {user.email ?? "-"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                Membre depuis {created}
              </span>
            </div>
          </div>
        </div>
      </section>

      <AccountClient
        userId={user.id}
        initialPseudo={pseudo}
        initialFavorite={profile?.favoriteTeam ?? null}
        role={role}
      />
    </div>
  );
}
