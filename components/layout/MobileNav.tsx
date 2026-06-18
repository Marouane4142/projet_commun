"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/components/layout/navItems";

/** Menu burger pour mobile (telephone). Contient tous les liens de navigation. */
export function MobileNav({ gerant }: { gerant: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.gerantOnly || gerant);

  // Ferme le menu a chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-200"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />
          <nav
            aria-label="Navigation mobile"
            className="fixed inset-x-3 top-20 z-[70] grid max-h-[75vh] gap-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    active
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "text-slate-200 hover:bg-white/[0.07]"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
