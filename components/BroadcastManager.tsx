"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { extractYoutubeId } from "@/lib/youtube";

export function BroadcastManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
  const [kind, setKind] = useState<"resume" | "live" | "best">("resume");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) {
      setMsg("URL YouTube invalide.");
      return;
    }
    if (title.trim().length < 2) {
      setMsg("Donne un titre.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("g1a_broadcasts").insert({
      title: title.trim(),
      youtube_id: youtubeId,
      match_label: matchLabel.trim() || null,
      kind,
    });
    setSaving(false);
    if (error) {
      setMsg("Erreur : " + error.message);
      return;
    }
    setUrl("");
    setTitle("");
    setMatchLabel("");
    setMsg("Diffusion ajoutée !");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
      >
        <Plus size={16} /> Ajouter une diffusion
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5"
    >
      <h3 className="text-sm font-black uppercase text-emerald-200">
        Ajouter une diffusion (gérant)
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs font-bold text-slate-300">Lien YouTube</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-300">Titre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-300">Match (optionnel)</span>
          <input
            value={matchLabel}
            onChange={(e) => setMatchLabel(e.target.value)}
            placeholder="France vs Sénégal"
            className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-300">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "resume" | "live" | "best")}
            className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70"
          >
            <option value="resume">Résumé</option>
            <option value="live">Live</option>
            <option value="best">Best of</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Publier
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-bold text-slate-400 hover:text-white"
        >
          Annuler
        </button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}
