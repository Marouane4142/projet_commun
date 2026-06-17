import {
  ArrowRight,
  Clapperboard,
  Gauge,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
  Volume2,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";
import { getCurrentUser } from "@/lib/profileService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [eco, user] = await Promise.all([
    getEcosystemSnapshot(),
    getCurrentUser(),
  ]);

  const liveSensors = eco.domains.filter((d) => d.status === "live").length;
  const sound = eco.domains.find((d) => d.key === "sound");
  const affluence = eco.domains.find((d) => d.key === "affluence");
  const air = eco.domains.find((d) => d.key === "air");
  const temperature = eco.domains.find((d) => d.key === "temperature");
  const alcohol = eco.domains.find((d) => d.key === "alcohol");

  return (
    <div className="grid gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-blue-600/10 to-amber-500/10 p-8 sm:p-12">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">
            <Trophy size={14} /> Coupe du Monde 2026
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
            FanBar Arena
          </h1>
          <p className="mt-4 text-lg text-slate-200 sm:text-xl">
            La regie connectee d&apos;un bar de supporters. Le son, l&apos;affluence,
            l&apos;air et le service sont pilotes en temps reel grace au reseau de
            capteurs de toute la salle.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/regie"
              className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-slate-950 transition hover:bg-emerald-300"
            >
              <Radio size={18} /> Ouvrir la regie live
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 font-black text-white transition hover:bg-white/10"
              >
                <Gauge size={18} /> Duel de zones
              </Link>
            ) : (
              <Link
                href="/register"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 font-black text-white transition hover:bg-white/10"
              >
                Creer un compte <ArrowRight size={18} />
              </Link>
            )}
          </div>
          {user && (
            <p className="mt-4 text-sm text-emerald-200">
              Bon retour, {user.profile?.pseudo ?? "supporter"} !
            </p>
          )}
        </div>
        <Trophy
          className="pointer-events-none absolute -right-6 -top-6 hidden text-white/5 sm:block"
          size={260}
        />
      </section>

      {/* Teaser live ecosysteme */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LiveStat
          icon={Radio}
          label="Capteurs actifs"
          value={`${liveSensors}`}
          sub="en temps reel"
          accent="#34d399"
        />
        <LiveStat
          icon={Volume2}
          label="Ambiance sonore"
          value={sound?.value != null ? `${sound.value}` : "--"}
          sub="decibels"
          accent="#38bdf8"
        />
        <LiveStat
          icon={Users}
          label="Affluence"
          value={affluence?.value != null ? `${affluence.value}` : "--"}
          sub="personnes"
          accent="#a78bfa"
        />
        <LiveStat
          icon={Wind}
          label="Qualite de l'air"
          value={air?.value != null ? `${air.value}` : "--"}
          sub="ppm"
          accent="#fbbf24"
        />
      </section>

      {/* Capteurs du bar */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <h2 className="text-2xl font-black">Tout le bar, en temps reel</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          Le bar est equipe de plusieurs capteurs qui mesurent en continu
          l&apos;ambiance, le confort et la securite. FanBar Arena reunit toutes
          ces informations pour piloter la soiree d&apos;un seul coup d&apos;oeil.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NetworkCard title="Ambiance sonore" desc="Niveau sonore des supporters, zone par zone." live={sound?.status === "live"} />
          <NetworkCard title="Affluence" desc="Comptage des entrees et sorties du bar." live={affluence?.status === "live"} />
          <NetworkCard title="Qualite de l'air" desc="Detection de fumee et securite incendie." live={air?.status === "live"} />
          <NetworkCard title="Prevention alcool" desc="Mesure d'alcoolemie avant le depart." live={alcohol?.status === "live"} />
          <NetworkCard title="Temperature & humidite" desc="Confort thermique de la salle, en continu." live={temperature?.status === "live"} />
        </div>
      </section>

      {/* Acces rapides */}
      <section className="grid gap-4 md:grid-cols-3">
        <FeatureLink
          href="/regie"
          icon={Radio}
          title="Regie live"
          desc="Le cockpit temps reel multi-capteurs avec indices et alertes."
        />
        <FeatureLink
          href="/diffusion"
          icon={Clapperboard}
          title="Diffusion"
          desc="Resumes officiels FIFA 2026 integres directement dans le site."
        />
        <FeatureLink
          href="/about"
          icon={ShieldCheck}
          title="Architecture"
          desc="Securite, eco-conception et accessibilite du projet."
        />
      </section>
    </div>
  );
}

function LiveStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Radio;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        <Icon size={15} style={{ color: accent }} /> {label}
      </div>
      <div className="mt-2 text-3xl font-black" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function NetworkCard({
  title,
  desc,
  live,
}: {
  title: string;
  desc: string;
  live: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div className="font-black">{title}</div>
        <span
          className={`shrink-0 text-[11px] font-bold ${live ? "text-emerald-300" : "text-slate-500"}`}
        >
          {live ? "● live" : "○ attente"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}

function FeatureLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Radio;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 flex items-center gap-1 text-lg font-black">
        {title}
        <ArrowRight
          size={16}
          className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
        />
      </h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </Link>
  );
}
