"use client";

import { Check, Loader2, ShieldCheck, Star, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const WORLD_CUP_TEAMS = [
  "France",
  "Brésil",
  "Argentine",
  "Espagne",
  "Angleterre",
  "Portugal",
  "Allemagne",
  "Pays-Bas",
  "Belgique",
  "Croatie",
  "Maroc",
  "Sénégal",
  "Japon",
  "États-Unis",
  "Mexique",
];

type Props = {
  userId: string;
  initialPseudo: string;
  initialFavorite: string | null;
  role: "client" | "gerant";
};

type ProfileRow = {
  id: string;
  pseudo: string;
  role: "client" | "gerant";
  favorite_team: string | null;
};

export function AccountClient({ userId, initialPseudo, initialFavorite, role }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [pseudo, setPseudo] = useState(initialPseudo);
  const [favorite, setFavorite] = useState(initialFavorite ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    const { data } = await supabase
      .from("g1a_profiles")
      .select("id, pseudo, role, favorite_team")
      .order("created_at", { ascending: true });
    setMembers((data as ProfileRow[]) ?? []);
    setMembersLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (role === "gerant") void loadMembers();
  }, [role, loadMembers]);

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
      setProfileMsg("Échec de l'enregistrement : " + error.message);
      return;
    }
    setProfileMsg("Profil mis à jour.");
    router.refresh();
  }

  async function setMemberRole(target: ProfileRow, nextRole: "client" | "gerant") {
    setPendingId(target.id);
    const { error } = await supabase.rpc("g1a_set_role", {
      p_target: target.id,
      p_role: nextRole,
    });
    setPendingId(null);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    await loadMembers();
    if (target.id === userId) router.refresh();
  }

  return (
    <div className="grid gap-6">
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
                Équipe favorite
              </label>
              <input
                id="acc-team"
                list="wc-teams"
                value={favorite}
                onChange={(e) => setFavorite(e.target.value)}
                placeholder="Choisis ton équipe"
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
            Rôle
          </h2>
          {role === "gerant" ? (
            <div className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              Tu es <strong>gérant du bar</strong>. Tu peux créer des événements,
              régler les seuils, piloter la régie et attribuer le rôle de gérant à
              d&apos;autres comptes ci-dessous.
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              Tu es <strong>supporter</strong>. Seul le gérant du bar peut
              attribuer le rôle de gérant. Rapproche-toi de lui si besoin.
            </div>
          )}
        </div>
      </div>

      {/* Gestion des roles - gerant uniquement */}
      {role === "gerant" && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <UserCog size={18} className="text-amber-300" />
            Gestion des gérants
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Promeus un supporter en gérant, ou retire-lui le rôle.
          </p>

          {membersLoading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Chargement des comptes…
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {members.map((m) => {
                const isGerantMember = m.role === "gerant";
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-sm font-black">
                        {m.pseudo.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="font-bold">{m.pseudo}</div>
                        <div className="text-xs text-slate-500">
                          {isGerantMember ? "Gérant" : "Supporter"}
                          {m.id === userId && " · toi"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pendingId === m.id}
                      onClick={() =>
                        setMemberRole(m, isGerantMember ? "client" : "gerant")
                      }
                      className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition disabled:opacity-60 ${
                        isGerantMember
                          ? "border border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/10"
                          : "bg-amber-400 text-slate-950 hover:bg-amber-300"
                      }`}
                    >
                      {pendingId === m.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={15} />
                      )}
                      {isGerantMember ? "Retirer gérant" : "Promouvoir gérant"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
