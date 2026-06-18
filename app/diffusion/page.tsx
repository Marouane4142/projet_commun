import { Clapperboard, ExternalLink, Radio, Star } from "lucide-react";
import { BroadcastManager } from "@/components/BroadcastManager";
import { getBroadcasts } from "@/lib/broadcastsService";
import { getCurrentUser, isGerant } from "@/lib/profileService";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Broadcast } from "@/lib/types";

export const metadata = { title: "Diffusion - FanBar Arena" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<Broadcast["kind"], string> = {
  resume: "Resume",
  live: "Live",
  best: "Best of",
};

function VideoFrame({ broadcast, primary }: { broadcast: Broadcast; primary?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div className="relative aspect-video w-full">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={youtubeEmbedUrl(broadcast.youtubeId)}
          title={broadcast.title}
          loading={primary ? "eager" : "lazy"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="truncate font-black">{broadcast.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
            {broadcast.matchLabel && <span className="truncate">{broadcast.matchLabel}</span>}
            <a
              href={`https://www.youtube.com/watch?v=${broadcast.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-emerald-300 hover:underline"
            >
              <ExternalLink size={11} /> YouTube
            </a>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-black uppercase text-emerald-200">
          {broadcast.kind === "best" && <Star size={11} className="mr-1 inline" />}
          {KIND_LABEL[broadcast.kind]}
        </span>
      </figcaption>
    </figure>
  );
}

export default async function DiffusionPage() {
  const [{ items, fallback }, user] = await Promise.all([
    getBroadcasts(),
    getCurrentUser(),
  ]);
  const gerant = isGerant(user);
  const [featured, ...rest] = items;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/15 via-white/[0.04] to-emerald-500/10 p-6">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rose-300">
          <Clapperboard size={14} /> Diffusion Coupe du Monde 2026
        </p>
        <h1 className="mt-2 text-3xl font-black">Les matchs sur grand écran</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Résumés et temps forts de la Coupe du Monde 2026, diffusés directement
          dans la FanBar (lecture intégrée, aucune redirection).
        </p>
      </section>

      {gerant && (
        <section>
          <BroadcastManager />
        </section>
      )}

      {fallback && gerant && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Sélection par défaut. Ajoute tes propres diffusions avec le bouton
          ci-dessus pour personnaliser la programmation.
        </p>
      )}

      {featured && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-400">
            <Radio size={15} className="text-rose-300" /> À la une
          </h2>
          <div className="mx-auto max-w-4xl">
            <VideoFrame broadcast={featured} primary />
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
            Tous les résumés
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((b) => (
              <VideoFrame key={b.youtubeId} broadcast={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
