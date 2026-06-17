import { Target } from "lucide-react";
import { PredictionsClient } from "@/components/PredictionsClient";
import { getCurrentUser } from "@/lib/profileService";

export const metadata = { title: "Pronostics - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const user = await getCurrentUser();

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.04] to-emerald-500/10 p-6">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-300">
          <Target size={14} /> Pronostics supporters
        </p>
        <h1 className="mt-2 text-3xl font-black">Donne ton score</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Pronostique le resultat des matchs diffuses a la FanBar et compare-toi a
          la communaute. Les pronostics se ferment au coup d&apos;envoi.
        </p>
      </section>

      <PredictionsClient
        authenticated={Boolean(user)}
        userId={user?.id ?? null}
        pseudo={user?.profile?.pseudo ?? null}
      />
    </div>
  );
}
