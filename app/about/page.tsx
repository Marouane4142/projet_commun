import {
  Accessibility,
  Calculator,
  Leaf,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";

export const metadata = { title: "À propos - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const eco = await getEcosystemSnapshot();
  const liveSensors = eco.domains.filter((d) => d.status === "live").length;

  return (
    <div className="grid gap-6">
      {/* Intro */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/[0.04] to-blue-500/10 p-6 sm:p-8">
        <h1 className="text-3xl font-black">À propos de FanBar Arena</h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-200">
          FanBar Arena est le poste de pilotage d&apos;un bar de supporters pendant
          la Coupe du Monde 2026. L&apos;objectif : vivre chaque match à fond tout
          en gardant un lieu confortable et sûr, du premier supporter arrivé au coup
          de sifflet final.
        </p>
      </section>

      {/* Comment ça marche */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Sparkles size={18} className="text-emerald-300" /> Comment ça marche
        </h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <Step n="1" title="On mesure">
            Des capteurs répartis dans le bar suivent en continu l&apos;ambiance
            sonore, l&apos;affluence, la qualité de l&apos;air et le confort.
          </Step>
          <Step n="2" title="On rassemble">
            Toutes ces mesures arrivent en direct au même endroit : le tableau de
            bord se met à jour tout seul, toutes les deux secondes.
          </Step>
          <Step n="3" title="On pilote">
            Le gérant suit l&apos;ambiance des deux camps, reçoit des alertes en cas
            de besoin et anime la soirée (diffusions, pronostics).
          </Step>
        </div>
      </section>

      {/* Ce qu'on suit */}
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

      {/* Comment sont calculés les indices */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Calculator size={18} className="text-amber-300" /> Comment sont calculés les indices
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Tous les indices vont de 0 à 100 et sont recalculés en direct à partir des capteurs.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Formula title="Ambiance sonore (0 → 100)">
            Convertit le niveau sonore en score d&apos;ambiance :
            <ul className="mt-1 ml-4 list-disc text-slate-300">
              <li><strong>40 dB → 0</strong> (salle calme), <strong>100 dB → 100</strong> (survoltée)</li>
              <li>Formule : <code className="text-emerald-200">(dB − 40) / 60 × 100 × 0,7</code></li>
              <li>+ 30 % du taux de remplissage : <code className="text-emerald-200">(affluence / capacité) × 100 × 0,3</code></li>
              <li>Bonus +6 points si un pic sonore dépasse la moyenne de +8 dB (explosion de joie)</li>
            </ul>
          </Formula>
          <Formula title="Esprit festif (0 → 100)">
            Mélange ambiance sonore et fréquentation pour refléter l&apos;intensité de la soirée :
            <code className="mt-1 block text-emerald-200">
              0,6 × ambiance + 0,4 × (affluence / capacité × 100)
            </code>
            <p className="mt-1 text-slate-400">Plus le bar est plein et bruyant, plus l&apos;esprit festif monte.</p>
          </Formula>
          <Formula title="Confort (100 → 0, par pénalités)">
            Part de <strong>100</strong> (confort parfait) et retire des pénalités :
            <ul className="mt-1 ml-4 list-disc text-slate-300">
              <li><strong>Chaleur</strong> : au-dessus de 24 °C → <code className="text-rose-300">−5 par °C</code> (ex : 28 °C = −20)</li>
              <li><strong>Froid</strong> : en dessous de 20 °C → <code className="text-rose-300">−3 par °C</code> (ex : 17 °C = −9)</li>
              <li><strong>Sur-fréquentation</strong> : au-delà de 75 % de la capacité → <code className="text-rose-300">−0,8 par % au-dessus</code> (ex : 90 % = −12)</li>
              <li><strong>Fumée</strong> : proportionnel au ppm → <code className="text-rose-300">−2,2 par ppm</code>, max −45</li>
              <li><strong>Gaz</strong> : au-delà de 350 ppm → <code className="text-rose-300">−(ppm − 350) / 12</code>, max −35</li>
            </ul>
          </Formula>
          <Formula title="Sécurité (100 → 0, par pénalités)">
            Part de <strong>100</strong> (situation sûre) et retire des pénalités graves :
            <ul className="mt-1 ml-4 list-disc text-slate-300">
              <li><strong>Fumée / incendie</strong> : pénalité forte → <code className="text-rose-300">−3,5 par ppm</code>, max −60 (danger immédiat)</li>
              <li><strong>Gaz toxique</strong> : au-delà de 200 ppm → <code className="text-rose-300">−(ppm − 200) / 8</code>, max −50</li>
              <li><strong>Sur-fréquentation</strong> : au-delà de 85 % de la capacité → <code className="text-rose-300">−1,5 par % au-dessus</code> (risque d&apos;écrasement)</li>
              <li><strong>Alcoolémie foule</strong> : moyenne &gt; 0,5 g/L → <code className="text-rose-300">−(moyenne − 0,5) × 30</code>, max −25</li>
            </ul>
          </Formula>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Les seuils (vigilance / alerte / critique) de chaque capteur sont réglables
          par le gérant dans la page Seuils.
        </p>
      </section>

      {/* Nos engagements */}
      <section className="grid gap-4 md:grid-cols-3">
        <Pillar icon={ShieldCheck} title="Sécurité" color="#34d399">
          <li>Comptes protégés par mot de passe chiffré.</li>
          <li>Chaque personne n&apos;accède qu&apos;à ce qui la concerne.</li>
          <li>Deux profils : supporter et gérant ; seul un gérant peut nommer un autre gérant.</li>
          <li>Les fonctions sensibles sont réservées au gérant.</li>
        </Pillar>
        <Pillar icon={Leaf} title="Éco-conception" color="#a3e635">
          <li>Les mises à jour se mettent en pause quand l&apos;onglet n&apos;est pas visible.</li>
          <li>Un mode éco réduit la fréquence d&apos;actualisation.</li>
          <li>Des visuels légers pour limiter la consommation.</li>
          <li>Les vidéos ne se chargent que lorsqu&apos;on en a besoin.</li>
        </Pillar>
        <Pillar icon={Accessibility} title="Accessibilité" color="#38bdf8">
          <li>Navigation complète au clavier et repères clairs.</li>
          <li>Compatibilité avec les lecteurs d&apos;écran.</li>
          <li>Animations réduites si vous le préférez.</li>
          <li>Contrastes élevés pour une bonne lisibilité.</li>
        </Pillar>
      </section>
    </div>
  );
}

function Formula({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
      <div className="font-black text-white">{title}</div>
      <div className="mt-1 leading-6">{children}</div>
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
