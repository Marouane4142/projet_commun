import { Wine } from "lucide-react";
import { redirect } from "next/navigation";
import { AlcoholClient } from "@/components/AlcoholClient";
import { getAlcoholReport, getPersonalAlcoholStats } from "@/lib/alcoholService";
import { getCurrentUser, isGerant } from "@/lib/profileService";
import { createClient } from "@/utils/supabase/server";
import { ALCOHOL_LIMIT } from "@/lib/constants";

export const metadata = { title: "Alcoolémie - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function AlcoholPage() {
  const user = await getCurrentUser();

  // Page reservee aux utilisateurs authentifies.
  if (!user) redirect("/login");

  const gerant = isGerant(user);

  // Utilisateur non-gerant : on verifie s'il a des sujets lies.
  // S'il n'en a pas, il n'a pas accès à la page.
  if (!gerant) {
    const myStats = await getPersonalAlcoholStats(user.id);
    if (myStats.length === 0) redirect("/account");

    // Le supporter ne voit QUE ses propres graphes.
    return (
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-white/[0.04] to-rose-500/10 p-6">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-300">
            <Wine size={14} /> Mon alcoolémie
          </p>
          <h1 className="mt-2 text-3xl font-black">Mon suivi personnel</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Voici l&apos;évolution de ton taux d&apos;alcool. Ces données ont été
            associées à ton compte par le gérant du bar.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {myStats.map((person) => {
            const over = person.latest >= ALCOHOL_LIMIT;
            const color = over ? "#f87171" : "#34d399";
            return (
              <article
                key={person.subjectId}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black">{person.name}</span>
                    <div className="text-[11px] text-slate-500">
                      {person.count} test(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color }}>
                      {person.latest.toFixed(2).replace(".", ",")}
                      <span className="text-sm text-slate-400"> g/L</span>
                    </div>
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
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-lg font-black text-slate-200">
                      {person.average.toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-slate-500">Moyenne</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-200">
                      {person.max.toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-slate-500">Max</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-200">
                      {new Date(person.lastTestAt).toLocaleString("fr-FR", {
                        timeZone: "UTC",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-slate-500">Dernier test</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // Gerant : vue complete avec tous les sujets.
  const report = await getAlcoholReport();
  const supabase = await createClient();
  const { data } = await supabase
    .from("g1a_profiles")
    .select("id, pseudo")
    .order("pseudo");
  const profiles = (data ?? []) as { id: string; pseudo: string }[];

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-white/[0.04] to-rose-500/10 p-6">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-300">
          <Wine size={14} /> Prévention alcoolémie
        </p>
        <h1 className="mt-2 text-3xl font-black">Suivi de l&apos;alcoolémie</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Évolution du taux d&apos;alcool par personne, repérage de celles qui
          dépassent la limite légale et niveau moyen de la foule, pour organiser
          des retours en toute sécurité.
        </p>
      </section>

      <AlcoholClient initial={report} gerant={gerant} profiles={profiles} />
    </div>
  );
}
