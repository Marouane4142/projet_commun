"use client";

import { LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  pseudo: string | null;
  role: "client" | "gerant" | null;
  authenticated: boolean;
};

export function UserMenu({ pseudo, role, authenticated }: Props) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Force un full reload pour vider le cache serveur et les cookies.
      window.location.href = "/";
    } catch {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
      >
        <LogIn size={16} />
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
      >
        {role === "gerant" ? (
          <ShieldCheck size={16} className="text-amber-300" />
        ) : (
          <UserRound size={16} className="text-emerald-300" />
        )}
        <span className="max-w-28 truncate">{pseudo ?? "Mon compte"}</span>
        {role === "gerant" && (
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-200">
            gérant
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
