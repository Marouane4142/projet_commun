"use client";

import { Check, Loader2, ShieldCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

const WORLD_CUP_TEAMS = [
  "France",
  "Bresil",
  "Argentine",
  "Espagne",
  "Angleterre",
  "Portugal",
  "Allemagne",
  "Pays-Bas",
  "Belgique",
  "Croatie",
  "Maroc",
  "Senegal",
  "Japon",
  "Etats-Unis",
  "Mexique",
];

type Props = {
  userId: string;
  initialPseudo: string;
  initialFavorite: string | null;
  role: "client" | "gerant";
};

export function AccountClient({ userId, initialPseudo, initialFavorite, role }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [pseudo, setPseudo] = useState(initialPseudo);
  const [favorite, setFavorite] = useState(initialFavorite ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [gerantCode, setGerantCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await supabase
      .from("g1a_profiles")
      .update({ pseudo: pseudo.trim(), favorite_team: favorite.trim() || null })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) {
      setProfileMsg("Echec de l'enregistrement : " + error.message);
      return;
    }
    setProfileMsg("Profil mis a jour.");
    router.refresh();
  }

  async function claimGerant(e: React.FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setClaimMsg(null);
    const { data, error } = await supabase.rpc("g1a_claim_gerant", {
      p_code: gerantCode.trim(),
    });
    setClaiming(false);
    if (error) {
      setClaimMsg("Erreur : " + error.message);
      return;
    }
    if (data === "gerant") {
      setClaimMsg("Tu es maintenant gerant. La regie complete est debloquee.");
      router.refresh();
    } else {
      setClaimMsg("Code invalide.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
      >
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Star size={18} className="text-emerald-300" />
          Mon profil supporter
        </h2>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="acc-pseudo" className="text-sm font-bold text-slate-300">
              Pseudo
            </label>
            <input
              id="acc-pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="acc-team" className="text-sm font-bold text-slate-300">
              Equipe favorite
            </label>
            <input
              id="acc-team"
              list="wc-teams"
              value={favorite}
              onChange={(e) => setFavorite(e.target.value)}
              placeholder="Choisis ton equipe"
              className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
            />
            <datalist id="wc-teams">
              {WORLD_CUP_TEAMS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {savingProfile ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Enregistrer
          </button>

          {profileMsg && (
            <p role="status" className="text-sm text-emerald-300">
              {profileMsg}
            </p>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <ShieldCheck size={18} className="text-amber-300" />
          Acces gerant
        </h2>

        {role === "gerant" ? (
          <div className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Tu as le role <strong>gerant</strong>. Tu peux creer des evenements,
            regler les seuils et piloter toute la regie.
          </div>
        ) : (
          <form onSubmit={claimGerant} className="mt-5 grid gap-4">
            <p className="text-sm text-slate-400">
              Le gerant du bar pilote les evenements et les seuils. Saisis le code
              d&apos;acces fourni par l&apos;equipe pour debloquer ce role.
            </p>
            <div className="grid gap-1.5">
              <label htmlFor="gerant-code" className="text-sm font-bold text-slate-300">
                Code d&apos;acces gerant
              </label>
              <input
                id="gerant-code"
                value={gerantCode}
                onChange={(e) => setGerantCode(e.target.value)}
                className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <button
              type="submit"
              disabled={claiming}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {claiming ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Devenir gerant
            </button>
            {claimMsg && (
              <p role="status" className="text-sm text-amber-200">
                {claimMsg}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
