"use client";

import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Mode = "login" | "register";

export function AuthClient({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const isRegister = mode === "register";

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function ensureProfile(userId: string, fallbackPseudo: string) {
    // Upsert idempotent : crée le profil si absent (RLS : insert/update self).
    await supabase
      .from("g1a_profiles")
      .upsert(
        { id: userId, pseudo: fallbackPseudo },
        { onConflict: "id", ignoreDuplicates: true },
      );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (isRegister) {
        const cleanPseudo = pseudo.trim();
        if (cleanPseudo.length < 2) {
          throw new Error("Choisis un pseudo d'au moins 2 caractères.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { pseudo: cleanPseudo },
            emailRedirectTo:
              typeof window === "undefined" ? undefined : `${window.location.origin}/login`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.user && data.session) {
          await ensureProfile(data.user.id, cleanPseudo);
        } else {
          setNotice("Compte créé. Vérifie ton email, puis connecte-toi.");
          setPassword("");
          return;
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          await ensureProfile(
            data.user.id,
            (data.user.user_metadata?.pseudo as string) ??
              email.split("@")[0] ??
              "Supporter",
          );
        }
      }

      router.push("/regie");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(translateError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400 text-slate-950">
            {isRegister ? <UserPlus size={22} /> : <LogIn size={22} />}
          </span>
          <div>
            <h1 className="text-xl font-black">
              {isRegister ? "Créer un compte" : "Connexion"}
            </h1>
            <p className="text-sm text-slate-400">
              {isRegister
                ? "Rejoins la FanBar Arena."
                : "Accède à la régie connectée."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {isRegister && (
            <Field
              id="pseudo"
              label="Pseudo"
              value={pseudo}
              onChange={setPseudo}
              autoComplete="nickname"
              required
            />
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />

          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-bold text-slate-300">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={6}
                aria-invalid={Boolean(error)}
                className="min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 pr-11 text-sm outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && (
              <p className="text-xs text-slate-500">6 caractères minimum.</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isRegister ? (
              <UserPlus size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {isRegister ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
          <ShieldCheck size={15} className="text-emerald-300" />
          Connexion sécurisée. Mots de passe chiffrés, jamais stockés en clair.
        </div>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegister ? (
            <>
              Déjà un compte ?{" "}
              <Link href="/login" className="font-bold text-emerald-300 hover:underline">
                Se connecter
              </Link>
            </>
          ) : (
            <>
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-bold text-emerald-300 hover:underline">
                Créer un compte
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
      />
    </div>
  );
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet email.";
  if (m.includes("password should be"))
    return "Mot de passe trop court (6 caractères minimum).";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Email invalide.";
  if (m.includes("error sending confirmation email"))
    return "Supabase n'a pas pu envoyer l'email de confirmation. Vérifie la configuration Auth / SMTP dans Supabase.";
  return message;
}
