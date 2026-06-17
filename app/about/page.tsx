import {
  Accessibility,
  Leaf,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";

export const metadata = { title: "A propos - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const eco = await getEcosystemSnapshot();
  const liveSensors = eco.domains.filter((d) => d.status === "live").length;

  return (
    <div className="grid gap-6">
      {/* Intro */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/[0.04] to-blue-500/10 p-6 sm:p-8">
        <h1 className="text-3xl font-black">A propos de FanBar Arena</h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-200">
          FanBar Arena est le poste de pilotage d&apos;un bar de supporters
          pendant la Coupe du Monde 2026. L&apos;objectif : vivre chaque match a
          fond tout en gardant un lieu confortable et sur, du premier supporter
          arrive au coup de sifflet final.
        </p>
      </section>

      {/* Comment ca marche */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Sparkles size={18} className="text-emerald-300" /> Comment ca marche
        </h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <Step n="1" title="On mesure">
            Des capteurs repartis dans le bar suivent en continu l&apos;ambiance
            sonore, l&apos;affluence, la qualite de l&apos;air et le confort.
          </Step>
          <Step n="2" title="On rassemble">
            Toutes ces mesures arrivent en direct au meme endroit, sans
            manipulation : le tableau de bord se met a jour tout seul.
          </Step>
          <Step n="3" title="On pilote">
            Le gerant suit l&apos;ambiance des deux camps, recoit des alertes en
            cas de besoin et anime la soiree (diffusions, pronostics).
          </Step>
        </div>
      </section>

      {/* Ce qu'on mesure */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Radio size={18} className="text-rose-300" /> Ce que l&apos;on suit en direct
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {eco.domains.map((d) => (
            <div
              key={d.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div>
                <div className="font-bold">{d.label}</div>
                <div className="text-xs text-slate-500">{d.sensor}</div>
              </div>
              <span
                className={`shrink-0 text-[11px] font-bold ${d.status === "live" ? "text-emerald-300" : "text-slate-500"}`}
              >
                {d.status === "live" ? "● en direct" : "○ en attente"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {liveSensors} capteur(s) actif(s) en ce moment.
        </p>
      </section>

      {/* Nos engagements */}
      <section className="grid gap-4 md:grid-cols-3">
        <Pillar icon={ShieldCheck} title="Securite" color="#34d399">
          <li>Comptes proteges par mot de passe chiffre.</li>
          <li>Chaque personne n&apos;accede qu&apos;a ce qui la concerne.</li>
          <li>Deux profils : visiteur et gerant, l&apos;acces gerant etant protege par un code.</li>
          <li>Les informations sensibles restent confidentielles.</li>
        </Pillar>
        <Pillar icon={Leaf} title="Eco-conception" color="#a3e635">
          <li>Les mises a jour se mettent en pause quand l&apos;onglet n&apos;est pas visible.</li>
          <li>Un mode eco reduit la frequence d&apos;actualisation.</li>
          <li>Des visuels legers pour limiter la consommation.</li>
          <li>Les videos ne se chargent que lorsqu&apos;on en a besoin.</li>
        </Pillar>
        <Pillar icon={Accessibility} title="Accessibilite" color="#38bdf8">
          <li>Navigation complete au clavier et reperes clairs.</li>
          <li>Compatibilite avec les lecteurs d&apos;ecran.</li>
          <li>Animations reduites si vous le preferez.</li>
          <li>Contrastes eleves pour une bonne lisibilite.</li>
        </Pillar>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-sm font-black text-slate-950">
          {n}
        </span>
        <span className="font-black">{title}</span>
      </div>
      <p className="mt-2 leading-6">{children}</p>
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="flex items-center gap-2 font-black">
        <Icon size={18} style={{ color }} /> {title}
      </h3>
      <ul className="mt-3 grid gap-1.5 text-sm text-slate-300 [&>li]:ml-4 [&>li]:list-disc">
        {children}
      </ul>
    </div>
  );
}
