import { Wine } from "lucide-react";
import { AlcoholClient } from "@/components/AlcoholClient";
import { getAlcoholReport } from "@/lib/alcoholService";
import { getCurrentUser, isGerant } from "@/lib/profileService";

export const metadata = { title: "Alcoolémie - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function AlcoholPage() {
  const [report, user] = await Promise.all([getAlcoholReport(), getCurrentUser()]);
  const gerant = isGerant(user);

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

      <AlcoholClient initial={report} gerant={gerant} />
    </div>
  );
}
