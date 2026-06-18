import { CalendarDays, Mail, UserRound, Wine } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountClient } from "@/components/AccountClient";
import { getCurrentUser } from "@/lib/profileService";
import { getPersonalAlcoholStats } from "@/lib/alcoholService";
import { ALCOHOL_LIMIT } from "@/lib/constants";

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

  // Stats d'alcoolemie personnelles (si un gerant a lie ce compte a un sujet).
  const myAlcoholStats = await getPersonalAlcoholStats(user.id);

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

      {/* Stats d'alcoolemie personnelles */}
      {myAlcoholStats.length > 0 && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Wine size={18} className="text-amber-300" />
            Mon suivi d&apos;alcoolémie
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Données associées à ton compte par le gérant du bar. Usage personnel uniquement.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myAlcoholStats.map((person) => {
              const over = person.latest >= ALCOHOL_LIMIT;
              return (
                <div
                  key={person.subjectId}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{person.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                        over
                          ? "bg-rose-500/20 text-rose-200"
                          : "bg-emerald-500/20 text-emerald-200"
                      }`}
                    >
                      {over ? "Au-dessus" : "OK"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-black text-lg" style={{ color: over ? "#f87171" : "#34d399" }}>
                        {person.latest.toFixed(2).replace(".", ",")}
                      </div>
                      <div className="text-slate-500">Dernier (g/L)</div>
                    </div>
                    <div>
                      <div className="font-black text-lg text-slate-200">
                        {person.average.toFixed(2).replace(".", ",")}
                      </div>
                      <div className="text-slate-500">Moyenne</div>
                    </div>
                    <div>
                      <div className="font-black text-lg text-slate-200">
                        {person.max.toFixed(2).replace(".", ",")}
                      </div>
                      <div className="text-slate-500">Max</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {person.count} test(s) · dernier :{" "}
                    {new Date(person.lastTestAt).toLocaleString("fr-FR", {
                      timeZone: "UTC",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
