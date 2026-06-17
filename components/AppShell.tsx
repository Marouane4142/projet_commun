import {
  BarChart3,
  CalendarPlus,
  Clapperboard,
  Gauge,
  Info,
  Radio,
  Settings,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, isGerant } from "@/lib/profileService";
import { UserMenu } from "@/components/UserMenu";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  gerantOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Accueil", icon: Trophy },
  { href: "/regie", label: "Regie live", icon: Radio },
  { href: "/dashboard", label: "Duel de zones", icon: Gauge },
  { href: "/diffusion", label: "Diffusion", icon: Clapperboard },
  { href: "/predictions", label: "Pronostics", icon: Target },
  { href: "/history", label: "Historique", icon: BarChart3 },
  { href: "/events/new", label: "Creer event", icon: CalendarPlus, gerantOnly: true },
  { href: "/settings", label: "Seuils", icon: Settings, gerantOnly: true },
  { href: "/about", label: "A propos", icon: Info },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const gerant = isGerant(user);
  const items = navItems.filter((item) => !item.gerantOnly || gerant);

  return (
    <div className="min-h-screen bg-[#070b11] text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-2 focus:font-black focus:text-slate-950"
      >
        Aller au contenu
      </a>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.22),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(145deg,#071019_0%,#111827_52%,#05070a_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px]">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-black/20 px-5 py-6 backdrop-blur xl:flex">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-400 text-slate-950">
              <Trophy size={22} />
            </span>
            <span>
              <span className="block text-lg font-black leading-tight">FanBar Arena</span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Regie Coupe du Monde
              </span>
            </span>
          </Link>

          <nav aria-label="Navigation principale" className="mt-9 grid gap-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-bold text-slate-300 transition hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
            <div className="flex items-center gap-2 font-black">
              <Radio size={16} />
              Capteurs connectes
            </div>
            <p className="mt-2 leading-6 text-emerald-100/75">
              La regie reunit tous les capteurs du bar : ambiance sonore,
              affluence, qualite de l&apos;air, confort et prevention.
            </p>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
            <Link href="/" className="flex items-center gap-2 font-black xl:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-400 text-slate-950">
                <Trophy size={16} />
              </span>
              FanBar Arena
            </Link>
            <nav
              aria-label="Navigation mobile"
              className="flex gap-2 overflow-x-auto xl:hidden"
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    title={item.label}
                    aria-label={item.label}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-200"
                  >
                    <Icon size={17} />
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto">
              <UserMenu
                authenticated={Boolean(user)}
                pseudo={user?.profile?.pseudo ?? null}
                role={user?.profile?.role ?? null}
              />
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
